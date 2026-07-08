import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type NodeChange,
  type OnNodesChange
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2 } from "lucide-react";
import type { JourneyGraph, JourneyNodeClass, PlaybookJourney } from "@funkmyfans/of-types";
import {
  JOURNEY_CLASS_META,
  type AnyJourneyRFNode,
  type JourneyGroupRFNode,
  type JourneyRFNode
} from "../../lib/journey";
import { JourneyNodeCard } from "./JourneyNodeCard";
import { JourneyGroupBackdrop } from "./JourneyGroupBackdrop";

const NODE_W = 248;
const NODE_H = 132;
const GROUP_PAD_X = 26;
const GROUP_PAD_TOP = 46;
const GROUP_PAD_BOTTOM = 26;

const nodeTypes = { journeyNode: JourneyNodeCard, journeyGroup: JourneyGroupBackdrop };

export function JourneyCanvas({
  journey,
  onOpenNode,
  onGraphChange,
  onDrillNode
}: {
  journey: PlaybookJourney;
  onOpenNode: (id: string) => void;
  onGraphChange?: (graph: JourneyGraph) => void;
  onDrillNode?: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <JourneyCanvasInner journey={journey} onOpenNode={onOpenNode} onGraphChange={onGraphChange} onDrillNode={onDrillNode} />
    </ReactFlowProvider>
  );
}

function JourneyCanvasInner({
  journey,
  onOpenNode,
  onGraphChange,
  onDrillNode
}: {
  journey: PlaybookJourney;
  onOpenNode: (id: string) => void;
  onGraphChange?: (graph: JourneyGraph) => void;
  onDrillNode?: (id: string) => void;
}) {
  const { fitView } = useReactFlow();

  const connectivity = useMemo(() => {
    const inbound = new Map<string, number>();
    const outbound = new Map<string, number>();
    for (const connection of journey.graph.connections) {
      outbound.set(connection.from.nodeId, (outbound.get(connection.from.nodeId) ?? 0) + 1);
      inbound.set(connection.to.nodeId, (inbound.get(connection.to.nodeId) ?? 0) + 1);
    }
    return { inbound, outbound };
  }, [journey]);

  const buildJourneyNodes = useCallback((): JourneyRFNode[] => {
    return journey.graph.nodes.map((node) => {
      const inbound = connectivity.inbound.get(node.id) ?? 0;
      const outbound = connectivity.outbound.get(node.id) ?? 0;
      return {
        id: node.id,
        type: "journeyNode",
        position: { x: node.position.x, y: node.position.y },
        zIndex: 1,
        data: {
          journeyNode: node,
          inbound,
          outbound,
          destinations: node.contract.destinations,
          isEntry: inbound === 0,
          onOpen: onOpenNode
        }
      };
    });
  }, [journey, connectivity, onOpenNode]);

  const [journeyNodes, setJourneyNodes] = useState<JourneyRFNode[]>(buildJourneyNodes);

  // Rebuild when a different journey is opened (positions come from the graph,
  // never from an auto-layout pass, so the map is not stretched into a line).
  useEffect(() => {
    setJourneyNodes(buildJourneyNodes());
  }, [buildJourneyNodes]);

  // Group boxes are derived from current member positions so they track drags
  // live. The same geometry is snapshotted into the serialized graph on save.
  const groupBoxes = useMemo(() => {
    const groups = journey.graph.groups ?? [];
    const boxes: Array<{ id: string; label: string; colorKey: string; x: number; y: number; width: number; height: number }> = [];
    for (const group of groups) {
      const members = journeyNodes.filter((node) => node.data.journeyNode.group === group.id);
      if (!members.length) continue;
      const minX = Math.min(...members.map((member) => member.position.x)) - GROUP_PAD_X;
      const minY = Math.min(...members.map((member) => member.position.y)) - GROUP_PAD_TOP;
      const maxX = Math.max(...members.map((member) => member.position.x)) + NODE_W + GROUP_PAD_X;
      const maxY = Math.max(...members.map((member) => member.position.y)) + NODE_H + GROUP_PAD_BOTTOM;
      boxes.push({ id: group.id, label: group.label, colorKey: group.colorKey ?? "#4b6b96", x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }
    return boxes;
  }, [journey, journeyNodes]);

  const groupNodes = useMemo<JourneyGroupRFNode[]>(
    () =>
      groupBoxes.map((box) => ({
        id: `group-${box.id}`,
        type: "journeyGroup",
        position: { x: box.x, y: box.y },
        data: { label: box.label, accent: box.colorKey },
        draggable: false,
        selectable: false,
        focusable: false,
        deletable: false,
        zIndex: 0,
        // Explicit dimensions so React Flow treats the node as measured and
        // renders it (nodes sized only via style stay visibility:hidden).
        width: box.width,
        height: box.height,
        style: { width: box.width, height: box.height }
      })),
    [groupBoxes]
  );

  const edges = useMemo<Edge[]>(
    () =>
      journey.graph.connections.map((connection) => ({
        id: connection.id,
        source: connection.from.nodeId,
        target: connection.to.nodeId,
        label: connection.label,
        style: { stroke: "rgba(125,167,222,0.5)", strokeWidth: 1.5 },
        labelStyle: { fill: "#a9bfe0", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "#0b1526", fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6
      })),
    [journey]
  );

  const onNodesChange = useCallback<OnNodesChange<AnyJourneyRFNode>>((changes) => {
    // Only journey nodes are draggable/selectable; group backdrops are derived
    // from journey-node positions, so changes for them never arrive here.
    setJourneyNodes((current) => applyNodeChanges<JourneyRFNode>(changes as unknown as NodeChange<JourneyRFNode>[], current));
  }, []);

  const allNodes = useMemo<AnyJourneyRFNode[]>(() => [...groupNodes, ...journeyNodes], [groupNodes, journeyNodes]);

  // Serialize the live canvas (current positions + group geometry) back into a
  // JourneyGraph so the workspace can persist exactly what is rendered.
  const serializeGraph = useCallback((): JourneyGraph => {
    const positionById = new Map(journeyNodes.map((node) => [node.id, node.position]));
    const nodes = journey.graph.nodes.map((node) => {
      const position = positionById.get(node.id);
      if (!position) return node;
      return { ...node, position: { x: Math.round(position.x), y: Math.round(position.y) } } as typeof node;
    });
    const groups = groupBoxes.length
      ? groupBoxes.map((box) => ({
          id: box.id,
          label: box.label,
          colorKey: box.colorKey,
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        }))
      : journey.graph.groups;
    return {
      schemaVersion: 1,
      selectedNodeId: journey.graph.selectedNodeId ?? null,
      nodes,
      connections: journey.graph.connections,
      groups,
      viewport: journey.graph.viewport
    };
  }, [journey, journeyNodes, groupBoxes]);

  useEffect(() => {
    onGraphChange?.(serializeGraph());
  }, [serializeGraph, onGraphChange]);

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fitView({ padding: 0.2, duration: 320 })}
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#0b1727]/85 px-3 py-1.5 text-xs font-semibold text-blue-50 backdrop-blur hover:border-white/25"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Fit to view
          </button>
          <span className="rounded-lg border border-white/10 bg-[#0b1727]/70 px-2.5 py-1.5 text-[11px] font-medium text-blue-100/60">
            {journey.graph.nodes.length} nodes
          </span>
        </div>
        <JourneyLegend />
      </div>

      <ReactFlow<AnyJourneyRFNode, Edge>
        nodes={allNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => {
          if (node.type === "journeyNode") onOpenNode(node.id);
        }}
        onNodeDoubleClick={(_, node) => {
          if (node.type === "journeyNode") onDrillNode?.(node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.75}
        nodesConnectable={false}
        nodesDraggable
        elementsSelectable
        panOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#20334d" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          maskColor="rgba(4,10,20,0.62)"
          nodeColor={miniMapNodeColor}
          style={{ background: "#0b1727", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10 }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function miniMapNodeColor(node: AnyJourneyRFNode): string {
  if (node.type === "journeyGroup") return "rgba(75,107,150,0.25)";
  return JOURNEY_CLASS_META[node.data.journeyNode.class].accent;
}

function JourneyLegend() {
  const classes = Object.keys(JOURNEY_CLASS_META) as JourneyNodeClass[];
  return (
    <div className="pointer-events-auto hidden flex-wrap items-center justify-end gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-[#0b1727]/80 px-3 py-1.5 backdrop-blur lg:flex">
      {classes.map((cls) => (
        <span key={cls} className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-blue-100/55">
          <span className="h-2 w-2 rounded-full" style={{ background: JOURNEY_CLASS_META[cls].accent }} />
          {JOURNEY_CLASS_META[cls].label}
        </span>
      ))}
    </div>
  );
}
