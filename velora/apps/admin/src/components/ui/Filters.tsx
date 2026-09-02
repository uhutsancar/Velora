import { InputAdornment, MenuItem, Stack, TextField, type TextFieldProps } from '@mui/material';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Liste sayfalarinin filtre seridi.
 *
 * Urunler, Siparisler ve Musteriler sayfalarinin ucunde de ayni arama kutusu ve
 * ayni serit yerlesimi vardi — arama ikonu, genislik ve bosluklar dahil satir
 * satir aynisi. Buraya tasindiginda cagri yeri yalnizca *neyin* filtrelendigini
 * soyler, nasil gorundugunu degil.
 */

/** Filtreleri tasiyan serit: mobilde alt alta, masaustunde yan yana. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      {children}
    </Stack>
  );
}

/** Ikonlu arama kutusu. */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      sx={{ minWidth: { md: 320 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search size={16} />
          </InputAdornment>
        ),
      }}
    />
  );
}

/** Secenekleri veri olarak alan filtre acilir listesi. */
export function FilterSelect({
  options,
  minWidth = 160,
  ...props
}: Omit<TextFieldProps, 'select' | 'children'> & {
  options: ReadonlyArray<{ value: string | number; label: ReactNode }>;
  minWidth?: number;
}) {
  return (
    <TextField {...props} select sx={{ minWidth, ...props.sx }}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
