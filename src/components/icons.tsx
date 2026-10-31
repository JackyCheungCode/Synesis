import React from 'react';
type P={size?:number;className?:string};
function Glyph({children,size=20,className}:P){return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>}
export const Add=(p:P)=><Glyph {...p}><path d="M12 5v14M5 12h14"/></Glyph>;
export const ArrowLeft=(p:P)=><Glyph {...p}><path d="m15 18-6-6 6-6M9 12h11"/></Glyph>;
export const ArrowRight=(p:P)=><Glyph {...p}><path d="m9 18 6-6-6-6M4 12h11"/></Glyph>;
export const Renew=(p:P)=><Glyph {...p}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/></Glyph>;
export const ChartLine=(p:P)=><Glyph {...p}><path d="M4 19V5M4 19h17M7 15l4-4 3 2 5-7"/></Glyph>;
export const Close=(p:P)=><Glyph {...p}><path d="m6 6 12 12M18 6 6 18"/></Glyph>;
export const Save=(p:P)=><Glyph {...p}><path d="M5 4h12l3 3v13H4V4z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></Glyph>;
export const Dashboard=(p:P)=><Glyph {...p}><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></Glyph>;
export const Key=(p:P)=><Glyph {...p}><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/></Glyph>;
export const Product=(p:P)=><Glyph {...p}><path d="m3 7 9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></Glyph>;
export const SettingsAdjust=(p:P)=><Glyph {...p}><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/></Glyph>;
export const Search=(p:P)=><Glyph {...p}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></Glyph>;
export const UserAvatar=(p:P)=><Glyph {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Glyph>;
