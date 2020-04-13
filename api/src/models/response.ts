interface IResponse {
  success: boolean;
  error: boolean;
  data: object;
}

export class SuccessResponse implements IResponse {
  success: boolean;
  error: boolean;
  data: object;
  constructor() {
    this.success = true;
    this.error = false;
  }
}

export class ErrorResponse implements IResponse {
  success: boolean;
  error: boolean;
  data: object;
  constructor(errorCode: string) {
    this.success = false;
    this.error = true;
    this.data = { errorCode: errorCode };
  }
}

export function CreateSuccessResponse(data: any): SuccessResponse {
  let r = new SuccessResponse();
  r.data = data;
  return r;
}

export function CreateErrorResponse(
  errCode: string,
  data?: any
): ErrorResponse {
  let r = new ErrorResponse(errCode);
  if (data != undefined) {
    r.data = data;
  }
  return r;
}
