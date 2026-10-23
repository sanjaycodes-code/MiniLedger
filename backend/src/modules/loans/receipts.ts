import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../../config';
import { prisma } from '../../db';
import {
  badRequest,
  notFound,
  unauthorized,
  unsupportedMediaType,
} from '../../errors';
import { todayUtc } from '../../lib/dates';
import { toLoanDto } from './mapper';
import { loanIdParams } from './schemas';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type CanonicalMime = 'image/jpeg' | 'image/png' | 'image/webp';

type AcceptedUploadMime =
  | CanonicalMime
  | 'image/jpg'
  | 'image/heic'
  | 'image/heif';

const MIME_TO_EXT: Record<CanonicalMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ACCEPTED_MIME_TO_EXT: Record<AcceptedUploadMime, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/heic': 'jpg',
  'image/heif': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXT_TO_MIME: Record<string, CanonicalMime> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function isAllowedMime(mime: string): mime is AcceptedUploadMime {
  return mime.toLowerCase() in ACCEPTED_MIME_TO_EXT;
}

export function getUploadRootDir(): string {
  return path.resolve(process.cwd(), config.UPLOAD_DIR);
}

/**
 * Resolves a stored relative `receiptPath` against `UPLOAD_DIR` and verifies
 * that the resulting path stays strictly inside `UPLOAD_DIR`.
 */
export function resolveSafeReceiptPath(relativeReceiptPath: string): string {
  const rootDir = getUploadRootDir();
  const resolved = path.resolve(rootDir, relativeReceiptPath);
  const rootWithSep = rootDir.endsWith(path.sep)
    ? rootDir
    : `${rootDir}${path.sep}`;

  if (!resolved.startsWith(rootWithSep)) {
    throw notFound('Receipt not found');
  }
  return resolved;
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw err;
    }
  }
}

/**
 * Sniffs the first 12 bytes of an uploaded file on disk to detect its actual
 * image format (JPEG, PNG, or WEBP) from magic bytes.
 */
async function detectMagicMime(filePath: string): Promise<CanonicalMime | null> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);

    if (
      bytesRead >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }

    if (
      bytesRead >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    if (
      bytesRead >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  } finally {
    await handle.close();
  }
}

/**
 * Validates `:id` and loads the loan owned by `req.user.id` into `res.locals.loan`.
 * Must run before multer so unauthorized or unknown-loan requests never write to disk.
 */
export async function loadOwnedLoan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
    }

    const { id } = loanIdParams.parse(req.params);
    const loan = await prisma.loan.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!loan) {
      throw notFound('Loan not found');
    }

    res.locals.loan = loan;
    next();
  } catch (err) {
    next(err);
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        cb(unauthorized('Missing or invalid token', 'UNAUTHORIZED'), '');
        return;
      }
      const userDir = path.join(getUploadRootDir(), userId);
      fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const lowerMime = file.mimetype.toLowerCase();
    const ext = isAllowedMime(lowerMime)
      ? ACCEPTED_MIME_TO_EXT[lowerMime]
      : 'bin';
    const loanId = (req.params as { id?: string }).id ?? 'loan';
    cb(null, `${loanId}-${Date.now()}.${ext}`);
  },
});

export const uploadReceiptMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_RECEIPT_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedMime(file.mimetype)) {
      cb(unsupportedMediaType());
      return;
    }
    cb(null, true);
  },
}).single('receipt');

export async function uploadLoanReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loan = res.locals.loan;
    if (!req.user || !loan) {
      throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
    }

    if (!req.file) {
      throw badRequest('Receipt file is required', [
        { field: 'receipt', message: 'Receipt file is required' },
      ]);
    }

    const uploadedFile = req.file;
    if (!isAllowedMime(uploadedFile.mimetype)) {
      await unlinkIfExists(uploadedFile.path);
      throw unsupportedMediaType();
    }

    const detectedMime = await detectMagicMime(uploadedFile.path);
    if (!detectedMime) {
      await unlinkIfExists(uploadedFile.path);
      throw unsupportedMediaType(
        'File contents do not match declared image type',
      );
    }

    const canonicalExt = MIME_TO_EXT[detectedMime];
    let finalFilename = uploadedFile.filename;
    const currentExt = path.extname(finalFilename).slice(1).toLowerCase();
    if (currentExt !== canonicalExt) {
      const baseName = finalFilename.slice(
        0,
        finalFilename.length - path.extname(finalFilename).length,
      );
      finalFilename = `${baseName}.${canonicalExt}`;
      const newPath = path.join(path.dirname(uploadedFile.path), finalFilename);
      await fs.promises.rename(uploadedFile.path, newPath);
    }

    if (loan.receiptPath) {
      const previousFullPath = resolveSafeReceiptPath(loan.receiptPath);
      await unlinkIfExists(previousFullPath);
    }

    const relativeReceiptPath = path.posix.join(
      req.user.id,
      finalFilename,
    );

    const updatedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: { receiptPath: relativeReceiptPath },
    });

    res.status(200).json({ loan: toLoanDto(updatedLoan, todayUtc()) });
  } catch (err) {
    next(err);
  }
}

export async function getLoanReceiptHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loan = res.locals.loan;
    if (!loan || !loan.receiptPath) {
      throw notFound('Receipt not found');
    }

    const fullPath = resolveSafeReceiptPath(loan.receiptPath);
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw notFound('Receipt not found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = EXT_TO_MIME[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath, (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}
