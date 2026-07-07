import { createContext, useContext } from 'react';

export const LayoutMenuContext = createContext<(() => void) | undefined>(undefined);

export function useLayoutMenu(): (() => void) | undefined {
    return useContext(LayoutMenuContext);
}
