export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const successResponse = <T>(
  statusCode: number,
  message: string,
  data?: T
): ApiResponse<T> => ({
  success: true,
  statusCode,
  message,
  data,
  timestamp: new Date().toISOString()
});

export const errorResponse = (
  statusCode: number,
  code: string,
  message: string,
  details?: any
): ApiErrorResponse => ({
  success: false,
  statusCode,
  error: {
    code,
    message,
    ...(details ? { details } : {})
  },
  timestamp: new Date().toISOString()
});
