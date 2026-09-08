"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";

type GraphNode = { id: string; label: string; type: "asset" | "person"; department?: string; email?: string; tags?: string[]; description?: string; owner?: string };
type GraphEdge = { id: string; outV: string; inV: string; label: string };
type GraphPayload = { nodes: GraphNode[]; edges: GraphEdge[]; stats: Record<string, unknown> };

const palette: Record<string,string> = {"Manufacturing":"#18a7a7","Engineering":"#417ee8","Data & Analytics":"#8a63e5","IT":"#ee8c42","Finance":"#d35888","Research":"#5ba46b","Person":"#a78bfa"};
const queryStopWords = new Set(["a","an","and","are","asset","assets","can","does","do","for","from","give","how","in","is","me","of","on","please","project","projects","show","tell","the","to","use","what","which","who","where","works","working","maintains","maintainer","owns","owner"]);
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

// Fuzzy match: check if search term matches any part of a label
const fuzzyMatch = (label: string, searchTerm: string): boolean => {
 if (!searchTerm) return false;
 const normalized = normalize(label);
 const normalizedTerm = normalize(searchTerm);
 
 // Exact word match
 if (normalized.split(" ").some(word => word === normalizedTerm)) return true;
 
 // Prefix match on any word
 if (normalized.split(" ").some(word => word.startsWith(normalizedTerm))) return true;
 
 // Substring match (partial)
 if (normalized.includes(normalizedTerm)) return true;
 
 // Reverse: check if search term contains any part of the label words
 if (normalizedTerm.split(" ").some(termWord => normalized.includes(termWord))) return true;
 
 return false;
};

export default function KnowledgeGraph(){
 const [graph, setGraph] = useState<GraphPayload | null>(null);
 const [active, setActive] = useState("asset-01");
 const [term, setTerm] = useState("");
 const [answer, setAnswer] = useState("");
 const [destination, setDestination] = useState("asset-08");
 
 useEffect(() => {
  fetch("http://localhost:8000/graph")
   .then(r => r.ok ? r.json() : Promise.reject())
   .then(setGraph)
   .catch(() => fetch("/mock-cosmos/asset_graph.json").then(r => r.json()).then(data => setGraph(data)));
 }, []);

 // Initialize defaults - hooks must be called BEFORE any returns
 const nodes = graph?.nodes ?? [];
 const edges = graph?.edges ?? [];
 const assetNodes = nodes.filter(n => n.type === "asset");
 const personNodes = nodes.filter(n => n.type === "person");
 const selected = nodes.find(n => n.id === active);

 const queryResult = useMemo(() => {
  if (!graph) return { nodes: [], answer: "Loading graph...", focus: [] as string[] };
  
  const question = normalize(term);
  if (!question) return { nodes: [], answer: "", focus: [] as string[] };
  
  // Check for person mentions using fuzzy matching
  const mentionedPerson = personNodes.find(p => fuzzyMatch(p.label, term));
  
  if (mentionedPerson) {
   const personMaintainsEdges = edges.filter(e => e.outV === mentionedPerson.id && e.label === "MAINTAINS");
   const maintainedAssets = personMaintainsEdges.map(e => nodes.find(n => n.id === e.inV)).filter(Boolean) as GraphNode[];
   const msg = `${mentionedPerson.label} maintains ${maintainedAssets.length} project${maintainedAssets.length === 1 ? "" : "s"}: ${maintainedAssets.map(a => a.label).join(", ")}.`;
   return { nodes: [mentionedPerson, ...maintainedAssets], answer: msg, focus: [mentionedPerson.id, ...maintainedAssets.map(a => a.id)] };
  }
  
  // Check for asset mentions using fuzzy matching
  const mentionedAsset = assetNodes.find(a => fuzzyMatch(a.label, term));
  
  if (mentionedAsset) {
   const maintainers = edges
    .filter(e => e.inV === mentionedAsset.id && e.label === "MAINTAINS")
    .map(e => nodes.find(n => n.id === e.outV))
    .filter(Boolean) as GraphNode[];
   const owners = edges
    .filter(e => e.inV === mentionedAsset.id && e.label === "OWNS")
    .map(e => nodes.find(n => n.id === e.outV))
    .filter(Boolean) as GraphNode[];
   const resultNodes = [mentionedAsset, ...maintainers, ...owners];
   const msg = `${mentionedAsset.label} is owned by ${owners.map(o => o.label).join(", ")} and maintained by ${maintainers.map(m => m.label).join(", ")}.`;
   return { nodes: resultNodes, answer: msg, focus: resultNodes.map(n => n.id) };
  }

  // Fallback: search by keyword
  const terms = question.split(/\s+/).filter(word => word && !queryStopWords.has(word));
  const matchingNodes = nodes.filter(node => 
   terms.some(t => fuzzyMatch(node.label, t) || (node.description && fuzzyMatch(node.description, t)))
  );

  return {
   nodes: matchingNodes,
   answer: matchingNodes.length ? `Found ${matchingNodes.length} matching node${matchingNodes.length === 1 ? "" : "s"}.` : "No matches found.",
   focus: matchingNodes.map(n => n.id)
  };
 }, [nodes, edges, personNodes, assetNodes, term, graph]);

 const visible = queryResult.nodes;
 const assetEdges = edges.filter(e => nodes.find(n => n.id === e.outV)?.type === "asset" && nodes.find(n => n.id === e.inV)?.type === "asset");
 
 // Layout nodes in a grid
 const positions: Record<string, [number, number]> = {};
 let row = 0, col = 0;
 nodes.forEach((node, i) => {
  positions[node.id] = [20 + (col % 5) * 15, 15 + (Math.floor(col / 5)) * 15];
  col++;
 });

 const loc = (id: string) => positions[id] || [50, 50];

 const findPath = (from: string, to: string) => {
  const graph = new Map<string, string[]>();
  edges.forEach(e => {
   graph.set(e.outV, [...(graph.get(e.outV) || []), e.inV]);
   graph.set(e.inV, [...(graph.get(e.inV) || []), e.outV]);
  });
  
  const queue = [from], parent = new Map([[from, ""]]);
  for (let i = 0; i < queue.length; i++) {
   const node = queue[i];
   if (node === to) break;
   (graph.get(node) || []).forEach(next => {
    if (!parent.has(next)) {
     parent.set(next, node);
     queue.push(next);
    }
   });
  }
  
  if (!parent.has(to)) return [];
  const path: string[] = [];
  for (let cur = to; cur; cur = parent.get(cur)!) path.unshift(cur);
  return path;
 };

 const path = answer ? findPath(active, destination) : [];
 const explain = () => {
  const p = findPath(active, destination);
  const fromNode = nodes.find(n => n.id === active);
  const toNode = nodes.find(n => n.id === destination);
  setAnswer(p.length ? `${fromNode?.label} is connected to ${toNode?.label} through ${p.length - 1} relationship ${p.length === 2 ? "hop" : "hops"}.` : `No relationship path was found in the local graph.`);
 };

 const selectedNodeType = selected?.type === "person" ? "Person" : "Asset";
 const isLoading = !graph || nodes.length === 0;

 return <main className="graph-page">
  {isLoading && <div className="graph-loading">Loading locally persisted graph…</div>}
  {!isLoading && <>
  <section className="graph-hero">
   <div>
    <span className="eyebrow"><Icons.Network size={15}/> LOCAL-FIRST KNOWLEDGE LAYER</span>
    <h1>Understand the <i>connections.</i></h1>
    <p>Explore relationships between reusable assets, maintainers, owners and dependencies — stored locally in a Cosmos DB-shaped container.</p>
   </div>
   <div className="graph-storage">
    <span><Icons.Database size={18}/> Local Cosmos simulation</span>
    <b>{assetNodes.length} assets + {personNodes.length} people</b>
    <small>Graph API with Gremlin-ready traversals</small>
   </div>
  </section>
  <section className="graph-kpis">
   {[[assetNodes.length, "assets"], [personNodes.length, "people"], [edges.length, "relationships"], [new Set(assetNodes.map(a => a.department)).size, "departments"]].map(([n, l]) => <div key={String(l)}><b>{n}</b><span>{l}</span></div>)}
  </section>
  <section className="graph-question">
   <span className="eyebrow"><Icons.Sparkles size={15}/> GRAPH ANSWER</span>
   <h2>{term ? queryResult.answer : "Ask a question across the graph"}</h2>
   <p>Search for people like 'Priya', 'Luca', assets, or relationships.</p>
  </section>
  <section className="graph-workspace">
   <aside className="graph-sidebar">
    <div className="sidebar-head"><span>QUERY RESULTS</span><b>{visible.length} results</b></div>
    <label className="graph-search"><Icons.Search size={16}/><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search people or assets (e.g., 'Priya', 'Luca')"/></label>
    <div className="asset-list">
     {visible.map(node => (
      <button onClick={() => { setActive(node.id); setAnswer(""); }} className={node.id === active ? "asset-choice active" : "asset-choice"} key={node.id}>
       <i style={{ background: palette[node.type === "person" ? "Person" : node.department || "Engineering"] }} />
       <span>
        <b>{node.label}</b>
        <small>{node.type === "person" ? node.email || "Maintainer" : node.department}</small>
       </span>
       <Icons.ChevronRight size={15}/>
      </button>
     ))}
    </div>
   </aside>
   <section className="graph-canvas">
    <div className="canvas-toolbar">
     <div><span className="live-dot"/> Live local graph</div>
     <small>Click any node to inspect</small>
    </div>
    <div className="graph-map">
     <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {assetEdges.map(e => {
       const [x1, y1] = loc(e.outV), [x2, y2] = loc(e.inV);
       const picked = path.some((p, i) => path[i + 1] === e.inV && p === e.outV) || path.some((p, i) => path[i + 1] === e.outV && p === e.inV);
       return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} className={picked ? "graph-line path" : "graph-line"} />;
      })}
      {/* Person-to-asset relationship lines */}
      {edges.filter(e => e.label === "MAINTAINS" || e.label === "OWNS").map(e => {
       const [x1, y1] = loc(e.outV), [x2, y2] = loc(e.inV);
       const picked = path.includes(e.outV) && path.includes(e.inV);
       return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="5,5" className={picked ? "graph-line path" : "graph-line"} style={{ opacity: 0.5 }} />;
      })}
     </svg>
     {nodes.map(node => {
      const [left, top] = loc(node.id);
      const isVisible = visible.some(v => v.id === node.id);
      const isAsset = node.type === "asset";
      const color = isAsset ? palette[node.department || "Engineering"] : palette["Person"];
      return (
       <button key={node.id} onClick={() => { setActive(node.id); setAnswer(""); }} style={{ left: `${left}%`, top: `${top}%`, borderColor: node.id === active ? color : undefined }} className={`graph-node ${node.id === active ? "selected" : ""} ${isVisible ? "" : "dim"}`}>
        <i style={{ background: color, borderRadius: node.type === "person" ? "50%" : "4px" }}/>
        <span>{node.label}</span>
       </button>
      );
     })}
    </div>
    <div className="graph-legend">
     {Object.entries(palette).filter(([k]) => k !== "Person").slice(0, 4).map(([name, color]) => <span key={name}><i style={{ background: color }}/>{name}</span>)}
     <span><i style={{ background: palette["Person"], borderRadius: "50%" }}/> People</span>
     <span className="edge-key"/> Relationships
    </div>
   </section>
   <aside className="inspector">
    {selected && <>
     <div className="inspector-top">
      <span>{selected.type === "person" ? "PERSON" : "ASSET"}</span>
      <button onClick={() => setActive("asset-01")} title="Reset selection"><Icons.RotateCcw size={15}/></button>
     </div>
     <div className="asset-symbol" style={{ background: palette[selected.type === "person" ? "Person" : selected.department || "Engineering"] }}>
      {selected.type === "person" ? <Icons.Users size={22}/> : <Icons.Box size={22}/>}
     </div>
     <h2>{selected.label}</h2>
     {selected.type === "asset" && <p>{selected.description}</p>}
     {selected.type === "person" && <p>{selected.email}</p>}
     {selected.type === "asset" && <div className="inspector-meta">
      <span><Icons.Building2 size={14}/>{selected.department}</span>
     </div>}
     {selected.tags && <div className="tag-row">{selected.tags.map(t => <span key={t}>{t}</span>)}</div>}
    </>}
   </aside>
  </section>
  <section className="relationship-answer">
   <div>
    <span className="eyebrow"><Icons.Sparkles size={15}/> RELATIONSHIP ANSWER</span>
    <h2>Trace a path between nodes</h2>
    <p>Find connections between any two entities (people or assets).</p>
   </div>
   <div className="answer-controls">
    <label>From<select value={active} onChange={e => { setActive(e.target.value); setAnswer(""); }}>
     {nodes.map(n => <option value={n.id} key={n.id}>{n.label} ({n.type})</option>)}
    </select></label>
    <label>To<select value={destination} onChange={e => { setDestination(e.target.value); setAnswer(""); }}>
     {nodes.map(n => <option value={n.id} key={n.id}>{n.label} ({n.type})</option>)}
    </select></label>
    <button className="button" onClick={explain}>Trace relationship <Icons.ArrowRight size={16}/></button>
    {answer && <div className="answer-result"><Icons.Route size={18}/><span><b>{answer}</b><small>{path.length ? `Path: ${path.map(p => nodes.find(n => n.id === p)?.label).join(" → ")}` : "Try a pair with a relationship."}</small></span></div>}
   </div>
  </section>
  </>}
 </main>;
}
