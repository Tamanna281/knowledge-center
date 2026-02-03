type ApiErrorPayload = {
  response?: {
    data?: {
      message?: string
    }
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as ApiErrorPayload).response
    const message = response?.data?.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}
