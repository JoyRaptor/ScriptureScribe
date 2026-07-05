import { getIcon } from './iconRegistry';

export function openBibleSvg(size = 22): string {
    return getIcon('open-bible-mode', size);
}

export function researchBibleSvg(size = 22): string {
    return getIcon('research-bible-mode', size);
}

export function scrollSvg(size = 64): string {
    return getIcon('open-scroll', size);
}
