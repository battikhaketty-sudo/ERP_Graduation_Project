import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type FlowDepEdgeData = {
  /** Vertical bow so parallel / skip edges do not overlap. */
  bow?: number;
  label?: string;
  muted?: boolean;
};

function buildBowedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  bow: number,
) {
  const midX = sourceX + (targetX - sourceX) * 0.5;
  const midY = (sourceY + targetY) / 2 + bow;
  // Cubic curve with control points pulled toward the bow so skip edges
  // clearly arc above/below the main chain.
  const c1x = sourceX + (midX - sourceX) * 0.55;
  const c2x = targetX - (targetX - midX) * 0.55;
  return {
    path: `M ${sourceX},${sourceY} C ${c1x},${midY} ${c2x},${midY} ${targetX},${targetY}`,
    labelX: midX,
    labelY: midY,
  };
}

/** Curved dependency edge with optional label — keeps fan-in readable. */
export function FlowDependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps<Edge<FlowDepEdgeData>>) {
  const bow = data?.bow ?? 0;
  const { path, labelX, labelY } = buildBowedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    bow,
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: data?.muted ? 1.5 : 2.25,
          opacity: data?.muted ? 0.75 : 1,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-md border border-hr-border bg-hr-surface px-1.5 py-0.5 text-[10px] font-semibold text-hr-text shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const flowDependencyEdgeTypes = {
  flowDep: FlowDependencyEdge,
};

/** Bow offset for the n-th edge among edges sharing a target. */
export const fanInBow = (fanIndex: number, fanCount: number, span: number) => {
  if (fanCount <= 1 && span <= 1) return 0;
  const base =
    fanCount <= 1 ? 0 : (fanIndex - (fanCount - 1) / 2) * 56;
  const skip = span > 1 ? (fanIndex % 2 === 0 ? -48 : 48) : 0;
  return base + skip;
};
