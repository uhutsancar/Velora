import type { ZodTypeAny } from 'zod';

/**
 * Adapts a Zod schema to Formik's `validate` prop.
 *
 * Formik expects a nested error object keyed by field path; Zod reports a flat
 * issue list with a path array, so we rebuild the nesting here. This keeps a single
 * schema as the source of truth for both validation and TypeScript types.
 */
export function zodValidator<TValues extends object>(schema: ZodTypeAny) {
  return (values: TValues): Record<string, unknown> => {
    const result = schema.safeParse(values);

    if (result.success) return {};

    const errors: Record<string, unknown> = {};

    for (const issue of result.error.issues) {
      if (issue.path.length === 0) continue;

      let cursor = errors;

      for (let index = 0; index < issue.path.length - 1; index += 1) {
        const key = String(issue.path[index]);
        const nextKey = issue.path[index + 1];

        // Arrays need an array container so Formik's FieldArray can address items.
        if (cursor[key] === undefined) {
          cursor[key] = typeof nextKey === 'number' ? [] : {};
        }

        cursor = cursor[key] as Record<string, unknown>;
      }

      const leaf = String(issue.path[issue.path.length - 1]);

      // Keep the first message per field: showing five variations of the same
      // problem under one input is noise, not help.
      if (cursor[leaf] === undefined) {
        cursor[leaf] = issue.message;
      }
    }

    return errors;
  };
}

/** Runs a schema and returns typed data or a flat field/message map. */
export function validateWithSchema<T>(
  schema: ZodTypeAny,
  values: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(values);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }

  return { success: false, errors };
}
