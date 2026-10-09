import{c as n,r as d,j as e,X as c,m as y}from"./index-CL87TD-A.js";import{r as h}from"./vendor-react-cxkclgJA.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=n("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=n("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=n("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=n("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=n("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);function k(t,l={}){if(!t)return;const s=typeof window<"u"&&(window.innerWidth<=768||/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),o=l.filename||`Inspection_${t}_Report.pdf`;if(s){const i=d.getPdfUrl(t,!0),r=document.createElement("a");r.href=i,r.setAttribute("download",o),r.download=o,r.target="_self",document.body.appendChild(r),r.click(),document.body.removeChild(r),d.downloadPdf(t,o).catch(()=>{})}else{const i=d.getPdfUrl(t,!1);window.open(i,"_blank","noopener,noreferrer")}}function w({isOpen:t,onClose:l,title:s="Advanced Filters",activeCount:o=0,onReset:i,children:r}){return h.useEffect(()=>(t?document.body.style.overflow="hidden":document.body.style.overflow="",()=>{document.body.style.overflow=""}),[t]),t?e.jsx("div",{className:"mobile-filter-modal-overlay",onClick:l,children:e.jsxs("div",{className:"mobile-filter-modal-content",onClick:a=>a.stopPropagation(),children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:"0.85rem",borderBottom:"1px solid #E2E8F0"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.6rem"},children:[e.jsx("div",{style:{width:"34px",height:"34px",borderRadius:"8px",backgroundColor:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(p,{size:18,color:"#2563EB"})}),e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("h3",{style:{fontSize:"1.05rem",fontWeight:800,color:"#0F172A",margin:0},children:s}),o>0&&e.jsx("span",{style:{fontSize:"0.65rem",backgroundColor:"#2563EB",color:"#FFFFFF",padding:"2px 7px",borderRadius:"12px",fontWeight:700},children:o})]}),e.jsx("span",{style:{fontSize:"0.72rem",color:"#64748B"},children:"Refine and search records"})]})]}),e.jsx("button",{onClick:l,style:{background:"#F1F5F9",border:"none",borderRadius:"50%",width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#64748B"},"aria-label":"Close filters",children:e.jsx(c,{size:18})})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",padding:"0.5rem 0"},children:r}),e.jsxs("div",{style:{display:"flex",gap:"0.65rem",paddingTop:"0.85rem",borderTop:"1px solid #E2E8F0"},children:[i&&e.jsxs("button",{type:"button",onClick:i,className:"btn btn-outline",style:{flex:1,justifyContent:"center",fontSize:"0.85rem"},children:[e.jsx(x,{size:14})," Reset"]}),e.jsxs("button",{type:"button",onClick:l,className:"btn btn-primary",style:{flex:1.5,justifyContent:"center",fontSize:"0.85rem",fontWeight:700},children:[e.jsx(y,{size:16})," Apply Filters"]})]})]})}):null}export{w as A,u as C,p as F,g as L,b as P,j as S,k as o};
