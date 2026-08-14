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
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { FLOW_END_ID, FLOW_START_ID } from "../../services/projects/flowAnchors";
import {
  buildAutoTerminalEdges,
  dependencyEdges,
  getTerminalLayout,
  layoutTaskDependencyGraph,
  TASK_FLOW_NODE_SIZE,
  type TaskFlowGate,
} from "../../services/projects/taskDependencies";
import type { Project, ProjectTask } from "../../types/project";
import {
  fanInBow,
  flowDependencyEdgeTypes,
} from "./FlowDependencyEdge";

export type TaskFlowFilter = "all";

type TaskNodeData = {
  task: ProjectTask;
  sectionName: string;
  gate: TaskFlowGate;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
};

type TerminalNodeData = {
  variant: "start" | "end";
  label: string;
};

type TaskDependencyFlowProps = {
  project: Project;
  search: string;
  onEditTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
};

const gateStyles: Record<TaskFlowGate, string> = {
  ready: "border-sky-500/60 bg-sky-500/10",
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

function TaskFlowNodeComponent({ data }: NodeProps<Node<TaskNodeData>>) {
  const { t } = useTranslation();
  const { priorityLabel } = useProjectLabels();

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
        <p className="line-clamp-2 text-sm font-bold text-hr-text" title={data.task.title}>
          {data.task.title || data.task.name}
        </p>
        <span className="shrink-0 rounded-md bg-hr-table-alt px-1.5 py-0.5 text-[10px] font-medium text-hr-muted">
          {t(`projects.detail.flow.gate.${data.gate}`)}
        </span>
      </div>
      <p className="mb-2 truncate text-[11px] text-hr-muted">
        {data.sectionName || t("common.dash")} · {priorityLabel(data.task.priority)}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="nodrag nopan rounded-md p-1 text-amber-500 hover:bg-hr-hover"
          title={t("common.edit")}
          aria-label={t("common.edit")}
          onClick={() => data.onEdit(data.task)}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className="nodrag nopan rounded-md p-1 text-red-500 hover:bg-hr-hover"
          title={t("common.delete")}
          aria-label={t("common.delete")}
          onClick={() => data.onDelete(data.task)}
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

const TaskFlowNode = memo(TaskFlowNodeComponent);
const TerminalFlowNode = memo(TerminalFlowNodeComponent);

const nodeTypes = {
  taskNode: TaskFlowNode,
  terminalNode: TerminalFlowNode,
};

const edgeTypes = flowDependencyEdgeTypes;

function TaskDependencyFlowCanvas({
  project,
  search,
  onEditTask,
  onDeleteTask,
}: TaskDependencyFlowProps) {
  const { t } = useTranslation();

  const sectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    project.sections.forEach((section) => map.set(section.id, section.name));
    return map;
  }, [project.sections]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return project.tasks.filter((task) => {
      if (!q) return true;
      const hay = `${task.title} ${task.name} ${task.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [project.tasks, search]);

  const visibleIds = useMemo(
    () => new Set(filteredTasks.map((task) => task.id)),
    [filteredTasks],
  );

  const initialNodes = useMemo(() => {
    const byId = new Map(project.tasks.map((task) => [task.id, task]));
    const layouts = layoutTaskDependencyGraph(filteredTasks);
    const terminals = getTerminalLayout(filteredTasks);

    const taskNodes: Node[] = layouts.map((layout) => {
      const task = byId.get(layout.taskId)!;
      return {
        id: task.id,
        type: "taskNode",
        position: { x: layout.x, y: layout.y },
        data: {
          task,
          sectionName: sectionNameById.get(task.sectionId) || "",
          gate: layout.gate,
          onEdit: onEditTask,
          onDelete: onDeleteTask,
        },
        style: {
          width: TASK_FLOW_NODE_SIZE.width,
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
          label: t("projects.detail.flow.graphStart"),
        },
        draggable: true,
        deletable: false,
      },
      ...taskNodes,
      {
        id: FLOW_END_ID,
        type: "terminalNode",
        position: terminals.end,
        data: {
          variant: "end" as const,
          label: t("projects.detail.flow.graphEnd"),
        },
        draggable: true,
        deletable: false,
      },
    ];
  }, [
    filteredTasks,
    onDeleteTask,
    onEditTask,
    project.tasks,
    sectionNameById,
    t,
  ]);

  const initialEdges: Edge[] = useMemo(() => {
    const titleById = new Map(
      project.tasks.map((task) => [task.id, task.title || task.name]),
    );

    const taskEdges = dependencyEdges(project.tasks)
      .filter(
        (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
      )
      .map((edge) => {
        const bow = fanInBow(edge.fanIndex, edge.fanCount, edge.span);
        const sourceTitle = titleById.get(edge.source) || "";
        return {
          id: edge.id,
          type: "flowDep" as const,
          source: edge.source,
          target: edge.target,
          animated: false,
          markerEnd: edgeMarker,
          style: edgeStyle,
          interactionWidth: 24,
          data: {
            bow,
            label:
              edge.fanCount > 1 || edge.span > 1
                ? sourceTitle.slice(0, 18)
                : undefined,
          },
        };
      });

    const terminalEdges = buildAutoTerminalEdges(
      filteredTasks,
      FLOW_START_ID,
      FLOW_END_ID,
    ).map((edge) => ({
      id: edge.id,
      type: "flowDep" as const,
      source: edge.source,
      target: edge.target,
      animated: false,
      markerEnd: edgeMarker,
      style: { ...edgeStyle, strokeDasharray: "5 4" },
      data: { bow: 0, muted: true },
    }));

    return [...taskEdges, ...terminalEdges];
  }, [filteredTasks, project.tasks, visibleIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  if (!filteredTasks.length && project.tasks.length > 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-table-alt px-4 text-center text-sm text-hr-muted">
        {t("projects.detail.flow.noFilterMatch")}
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
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.25 }}
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
      {!project.tasks.length ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center text-xs text-hr-muted">
          {t("projects.detail.flow.terminalsHint")}
        </p>
      ) : null}
    </div>
  );
}

/** Display-only graph of project tasks and dependencies (not a drawing canvas). */
export function TaskDependencyFlow(props: TaskDependencyFlowProps) {
  return (
    <ReactFlowProvider>
      <TaskDependencyFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
