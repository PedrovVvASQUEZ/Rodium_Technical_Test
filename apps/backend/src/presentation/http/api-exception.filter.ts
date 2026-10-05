import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ListContactsQueryError } from '../../application/contacts/list-contacts';
import { QueryValidationError } from './query-validation.error';

type ErrorBody = { statusCode: number; code: string; message: string };
type HttpResponse = { status(code: number): HttpResponse; json(body: ErrorBody): void };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof QueryValidationError || exception instanceof ListContactsQueryError) {
      return { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_QUERY', message: exception.message };
    }
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        code: 'HTTP_ERROR',
        message: typeof exception.message === 'string' ? exception.message : 'Request failed',
      };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Internal server error' };
  }
}