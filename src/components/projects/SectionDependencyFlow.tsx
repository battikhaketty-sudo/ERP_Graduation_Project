import { memo, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Flag, Pencil, Play, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { FLOW_END_ID, FLOW_START_ID } from "../../services/projects/flowAnchors";
import {
  buildAutoSectionTerminalEdges,
  getSectionFlowGate,
  getSectionTerminalLayout,
  layoutSectionDependencyGraph,
  SECTION_FLOW_NODE_SIZE,
  sectionDependencyEdges,
  type SectionFlowGate,
} from "../../services/projects/sectionDependencies";
import type { Project, ProjectSection } from "../../types/project";

export type SectionFlowFilter = "all" | "ready" | "blocked" | "completed";

type SectionNodeData = {
  section: ProjectSection;
  gate: SectionFlowGate;
  taskCount: number;
  completedCount: number;
  onEdit: (section: ProjectSection) => void;
  onDelete: (section: ProjectSection) => void;
};

type TerminalNodeData = {
  variant: "start" | "end";
  label: string;
};

type SectionDependencyFlowProps = {
  project: Project;
  filter: SectionFlowFilter;
  search: string;
  onEditSection: (section: ProjectSection) => void;
  onDeleteSection: (section: ProjectSection) => void;
};

const gateStyles: Record<SectionFlowGate, string> = {
  completed: "border-emerald-500/60 bg-emerald-500/10",
  ready: "border-sky-500/60 bg-sky-500/10",
  blocked: "border-amber-500/60 bg-amber-500/10",
};

const edgeStyle = {
  stroke: "#5BB8E8",
  strokeWidth: 2,
};

const edgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: "#5BB8E8",
};

function SectionFlowNodeComponent({ data }: NodeProps<Node<SectionNodeData>>) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "w-[220px] rounded-xl border-2 bg-hr-surface px-3 py-2.5 shadow-md",
        gateStyles[data.gate],
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2 !border-2 !border-hr-surface !bg-hr-primary !pointer-events-none"
      />
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-bold text-hr-text" title={data.section.name}>
          {data.section.name}
        </p>
        <span className="shrink-0 rounded-md bg-hr-table-alt px-1.5 py-0.5 text-[10px] font-medium text-hr-muted">
          {t(`projects.detail.sectionFlow.gate.${data.gate}`)}
        </span>
      </div>
      <p className="mb-2 truncate text-[11px] text-hr-muted">
        {t("projects.detail.sectionFlow.tasksInSection", {
          count: data.taskCount,
          completed: data.completedCount,
        })}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="nodrag nopan rounded-md p-1 text-amber-500 hover:bg-hr-hover"
          title={t("common.edit")}
          aria-label={t("common.edit")}
          onClick={() => data.onEdit(data.section)}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className="nodrag nopan rounded-md p-1 text-red-500 hover:bg-hr-hover"
          title={t("common.delete")}
          aria-label={t("common.delete")}
          onClick={() => data.onDelete(data.section)}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2 !border-2 !border-hr-surface !bg-hr-primary !pointer-events-none"
      />
    </div>
  );
}

function TerminalFlowNodeComponent({ data }: NodeProps<Node<TerminalNodeData>>) {
  const isStart = data.variant === "start";

  return (
    <div
      className={[
        "flex w-[140px] flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 shadow-md",
        isStart
          ? "border-sky-500/70 bg-sky-500/15 text-sky-400"
          : "border-emerald-500/70 bg-emerald-500/15 text-emerald-400",
      ].join(" ")}
    >
      {!isStart ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="!size-2 !border-2 !border-hr-surface !bg-emerald-500 !pointer-events-none"
        />
      ) : null}
      <span
        className={[
          "flex size-12 items-center justify-center rounded-full",
          isStart ? "bg-sky-500 text-white" : "bg-emerald-500 text-white",
        ].join(" ")}
      >
        {isStart ? <Play className="size-5 fill-current" /> : <Flag className="size-5" />}
      </span>
      <p className="text-sm font-bold text-hr-text">{data.label}</p>
      {isStart ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="!size-2 !border-2 !border-hr-surface !bg-sky-500 !pointer-events-none"
        />
      ) : null}
    </div>
  );
}

const SectionFlowNode = memo(SectionFlowNodeComponent);
const TerminalFlowNode = memo(TerminalFlowNodeComponent);

const nodeTypes = {
  sectionNode: SectionFlowNode,
  terminalNode: TerminalFlowNode,
};

function SectionDependencyFlowCanvas({
  project,
  filter,
  search,
  onEditSection,
  onDeleteSection,
}: SectionDependencyFlowProps) {
  const { t } = useTranslation();

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byId = new Map(project.sections.map((section) => [section.id, section]));

    return project.sections.filter((section) => {
      const gate = getSectionFlowGate(section, byId, project.tasks);
      if (filter === "ready" && gate !== "ready") return false;
      if (filter === "blocked" && gate !== "blocked") return false;
      if (filter === "completed" && gate !== "completed") return false;
      if (!q) return true;
      return section.name.toLowerCase().includes(q);
    });
  }, [filter, project.sections, project.tasks, search]);

  const visibleIds = useMemo(
    () => new Set(filteredSections.map((section) => section.id)),
    [filteredSections],
  );

  const initialNodes = useMemo(() => {
    const byId = new Map(project.sections.map((section) => [section.id, section]));
    const layouts = layoutSectionDependencyGraph(filteredSections, project.tasks);
    const terminals = getSectionTerminalLayout(filteredSections);

    const sectionNodes: Node[] = layouts.map((layout) => {
      const section = byId.get(layout.sectionId)!;
      const sectionTasks = project.tasks.filter(
        (task) => task.sectionId === section.id,
      );
      return {
        id: section.id,
        type: "sectionNode",
        position: { x: layout.x, y: layout.y },
        data: {
          section,
          gate: layout.gate,
          taskCount: sectionTasks.length,
          completedCount: sectionTasks.filter((task) => task.status === "completed")
            .length,
          onEdit: onEditSection,
          onDelete: onDeleteSection,
        },
        style: {
          width: SECTION_FLOW_NODE_SIZE.width,
        },
        draggable: true,
      };
    });

    return [
      {
        id: FLOW_START_ID,
        type: "terminalNode",
        position: terminals.start,
        data: {
          variant: "start" as const,
          label: t("projects.detail.sectionFlow.graphStart"),
        },
        draggable: true,
        deletable: false,
      },
      ...sectionNodes,
      {
        id: FLOW_END_ID,
        type: "terminalNode",
        position: terminals.end,
        data: {
          variant: "end" as const,
          label: t("projects.detail.sectionFlow.graphEnd"),
        },
        draggable: true,
        deletable: false,
      },
    ];
  }, [
    filteredSections,
    onDeleteSection,
    onEditSection,
    project.sections,
    project.tasks,
    t,
  ]);

  const initialEdges: Edge[] = useMemo(() => {
    const sectionEdges = sectionDependencyEdges(project.sections)
      .filter(
        (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
      )
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: false,
        markerEnd: edgeMarker,
        style: edgeStyle,
        interactive: false,
      }));

    const terminalEdges = buildAutoSectionTerminalEdges(
      filteredSections,
      FLOW_START_ID,
      FLOW_END_ID,
    ).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: false,
      markerEnd: edgeMarker,
      style: edgeStyle,
      interactive: false,
    }));

    return [...sectionEdges, ...terminalEdges];
  }, [filteredSections, project.sections, visibleIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  if (!filteredSections.length && project.sections.length > 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-table-alt px-4 text-center text-sm text-hr-muted">
        {t("projects.detail.sectionFlow.noFilterMatch")}
      </div>
    );
  }

  return (
    <div className="relative h-[min(70vh,560px)] min-h-[360px] overflow-hidden rounded-2xl border border-hr-border bg-hr-table-alt">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} size={1} />
        <Controls
          showInteractive={false}
          className="task-flow-controls !overflow-hidden !rounded-xl !border !border-hr-border !bg-hr-surface !shadow-md"
        />
        <MiniMap
          pannable
          zoomable
          className="task-flow-minimap !rounded-xl !border !border-hr-border !bg-hr-surface"
          maskColor="color-mix(in srgb, rgb(var(--hr-bg)) 55%, transparent)"
          nodeColor="rgb(var(--hr-primary))"
        />
      </ReactFlow>
      {!project.sections.length ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center text-xs text-hr-muted">
          {t("projects.detail.sectionFlow.terminalsHint")}
        </p>
      ) : null}
    </div>
  );
}

/** Display-only graph of project sections and workflow dependencies. */
export function SectionDependencyFlow(props: SectionDependencyFlowProps) {
  return (
    <ReactFlowProvider>
      <SectionDependencyFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
