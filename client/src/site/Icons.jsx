import React from 'react';

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IconSearch = (p) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>;
export const IconClose = (p) => <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconMenu = (p) => <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h10" /></svg>;
export const IconArrow = (p) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconBack = (p) => <svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
// Fabric swatch / weave
export const IconFabric = (p) => <svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M4 14h16M9 4v16M14 4v16" opacity=".55" /></svg>;
// Tailor's tape
export const IconTape = (p) => <svg {...base} {...p}><circle cx="9" cy="10" r="5.5" /><circle cx="9" cy="10" r="1.6" /><path d="M9 15.5h11v4H9M13 15.5v2M16 15.5v2M19 15.5v2" /></svg>;
// Stacked boxes
export const IconBoxes = (p) => <svg {...base} {...p}><rect x="3.5" y="12" width="8" height="8" rx="1" /><rect x="12.5" y="12" width="8" height="8" rx="1" /><rect x="8" y="3.5" width="8" height="8" rx="1" /></svg>;
// Delivery truck
export const IconTruck = (p) => <svg {...base} {...p}><path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>;
export const IconNeedle = (p) => <svg {...base} {...p}><path d="M4 20L18.5 5.5a2 2 0 0 1 2.8 2.8L6.8 22.8" /><path d="M3 12c3-3 6 3 9 0s6 3 9 0" opacity=".6" /></svg>;
