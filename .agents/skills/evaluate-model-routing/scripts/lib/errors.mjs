// Shared error vocabulary for every command.
// Exit codes are frozen in references/evaluation-method.md.

export const EXIT = {
  ok: 0,
  invalidInput: 2,
  sourceFailure: 3,
  noComparableData: 4,
  judgeSchemaMismatch: 5,
  replayMismatch: 6,
  calibrationMiss: 7,
};

export class CliError extends Error {
  /**
   * @param {object} spec
   * @param {string} spec.code   stable machine code, for example SOURCE_SCHEMA
   * @param {string} spec.message short failure summary
   * @param {number} spec.exit   process exit code
   * @param {string} [spec.cause] optional detail
   * @param {string[]} [spec.next] concrete next steps
   */
  constructor({ code, message, exit, cause, next = [] }) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exit = exit;
    this.cause = cause;
    this.next = next;
  }
}

export function invalidInput(message, cause, next = []) {
  return new CliError({ code: 'INVALID_INPUT', message, exit: EXIT.invalidInput, cause, next });
}

export function sourceFailure(code, message, cause, next = []) {
  return new CliError({ code, message, exit: EXIT.sourceFailure, cause, next });
}

export function formatError(error) {
  const lines = [`ERROR: ${error.message}`];
  if (error.cause) lines.push(`CAUSE: ${error.cause}`);
  const next = error.next ?? [];
  if (next.length > 0) {
    lines.push('NEXT:');
    for (const step of next) lines.push(`  - ${step}`);
  }
  return lines.join('\n');
}
