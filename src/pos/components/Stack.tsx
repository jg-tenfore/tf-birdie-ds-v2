import { Stack as MuiStack } from '@mui/material';
import type { StackProps as MuiStackProps } from '@mui/material';
import type { CSSProperties } from 'react';

/**
 * `Stack` with flexbox alignment props.
 *
 * MUI v7 removed system props from components, so v9's `Stack` accepts only
 * `direction`, `spacing`, `divider`, `useFlexGap`, and `sx` — `alignItems`,
 * `justifyContent`, `gap`, and `flexWrap` all have to go through `sx`.
 *
 * This layout code sets those constantly, and pushing every one into an `sx` object
 * buries the actual styling under alignment noise. So this wrapper accepts them as
 * props and forwards them into `sx`, keeping call sites readable. An explicit `sx`
 * still wins, so a caller can override any of them.
 */
export interface StackProps extends MuiStackProps {
  alignItems?: CSSProperties['alignItems'];
  justifyContent?: CSSProperties['justifyContent'];
  gap?: number | string;
  flexWrap?: CSSProperties['flexWrap'];
  flex?: number | string;
}

export function Stack({
  alignItems,
  justifyContent,
  gap,
  flexWrap,
  flex,
  sx,
  ...rest
}: StackProps) {
  const layout = { alignItems, justifyContent, gap, flexWrap, flex };
  return (
    <MuiStack
      sx={Array.isArray(sx) ? [layout, ...sx] : { ...layout, ...(sx as object) }}
      {...rest}
    />
  );
}

export default Stack;
