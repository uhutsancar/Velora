import {
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { useField } from 'formik';
import type { ReactNode } from 'react';

/**
 * Formik'e bagli alan bilesenleri.
 *
 * Neden var: MUI'nin TextField'i kontrollu bir bilesendir, dolayisiyla her cagri
 * yerinde value/onChange/onBlur/error/helperText/fullWidth altisisi elle
 * tekrarlanir. Bu alti prop alanin *kendisi* hakkinda hicbir sey soylemez —
 * sadece Formik'i MUI'ye baglar. Baglama isi bir kez burada yapilinca cagri
 * yeri alanin gercekten ne oldugu ile kalir:
 *
 *   <FormText name="sku" label="SKU" />
 *
 * Yeni bir alan eklemek tek satirdir; kaldirmak da o tek satiri silmektir.
 */

/** Formik hata nesneleri dizi/obje olabilir; ekrana yalnizca yaprak mesajlar cikar. */
function useLeafError(name: string) {
  const [field, meta] = useField(name);
  const error = meta.touched && typeof meta.error === 'string' ? meta.error : undefined;
  return { field, error };
}

type BaseProps = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText'
> & {
  name: string;
  /** Hata yokken gosterilecek yardim metni; hata varsa hata onun yerini alir. */
  hint?: ReactNode;
};

export function FormText({
  name,
  hint,
  transform,
  ...props
}: BaseProps & {
  /** Yazilirken degeri normalize eder; ornegin kupon kodu icin `(v) => v.toUpperCase()`. */
  transform?: (raw: string) => string;
}) {
  const { field, error } = useLeafError(name);

  return (
    <TextField
      {...props}
      {...field}
      value={field.value ?? ''}
      onChange={
        transform
          ? (event) => void field.onChange({ target: { name, value: transform(event.target.value) } })
          : field.onChange
      }
      error={Boolean(error)}
      helperText={error ?? hint}
      fullWidth
    />
  );
}

type NumberProps = BaseProps & {
  /** Bos birakildiginda 0 yerine null yazar — opsiyonel para alanlari icin. */
  nullable?: boolean;
  /** Ondalik kabul etmez; adet/siralama alanlari icin. */
  integer?: boolean;
};

export function FormNumber({ name, hint, nullable, integer, ...props }: NumberProps) {
  const { field, error } = useLeafError(name);
  const { onChange: _ignored, ...rest } = field;

  return (
    <TextField
      {...props}
      {...rest}
      type="number"
      value={field.value ?? ''}
      onChange={(event) => {
        const raw = event.target.value;
        const next = raw === '' ? (nullable ? null : 0) : integer ? Math.trunc(Number(raw)) : Number(raw);
        void field.onChange({ target: { name, value: next } });
      }}
      error={Boolean(error)}
      helperText={error ?? hint}
      fullWidth
      inputProps={{ min: 0, step: integer ? 1 : 0.01 }}
    />
  );
}

/** Secenekleri veri olarak alir; cagri yerinde MenuItem dongusu yazilmaz. */
export function FormSelect({
  name,
  hint,
  options,
  parse,
  ...props
}: BaseProps & {
  options: ReadonlyArray<{ value: string | number; label: ReactNode }>;
  /**
   * Secim ham string olarak gelir. Alan sayi ya da null tutuyorsa donusumu
   * burada bildirin: `parse={(raw) => (raw === '' ? null : Number(raw))}`.
   */
  parse?: (raw: string) => unknown;
}) {
  const { field, error } = useLeafError(name);

  return (
    <TextField
      {...props}
      {...field}
      select
      value={field.value ?? ''}
      onChange={
        parse
          ? (event) => void field.onChange({ target: { name, value: parse(event.target.value) } })
          : field.onChange
      }
      error={Boolean(error)}
      helperText={error ?? hint}
      fullWidth
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function FormSwitch({ name, label }: { name: string; label: ReactNode }) {
  const [field] = useField({ name, type: 'checkbox' });

  return <FormControlLabel control={<Switch {...field} checked={Boolean(field.value)} />} label={label} />;
}
