import { applyDecorators, Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

function envelopeSchema(model: Type<unknown>, statusCode: number) {
  return {
    type: 'object',
    required: ['status', 'message', 'statusCode', 'data'],
    properties: {
      status: { type: 'string', example: 'success' },
      message: {
        type: 'string',
        example: 'Operation completed successfully',
      },
      statusCode: { type: 'number', example: statusCode },
      data: { $ref: getSchemaPath(model) },
    },
  };
}

/** Documents the scol-style success envelope around a `data` payload. */
export function ApiEnvelopeResponse(model: Type<unknown>, statusCode = 200) {
  if (statusCode === 201) {
    return applyDecorators(
      ApiCreatedResponse({ schema: envelopeSchema(model, 201) }),
    );
  }
  return applyDecorators(
    ApiOkResponse({ schema: envelopeSchema(model, statusCode) }),
  );
}
