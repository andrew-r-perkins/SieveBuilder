import type {
  SieveScript, TopLevelBlock, BodyBlock, IfBlock,
  ElsifBlock, ElseBlock, NodeId,
} from '../types/sieve';
import { newId } from '../utils/idgen';
import { isIfBlock } from '../types/sieve';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find a block's parent body array and return a ref to it, or null */
function findParentBody(
  script: SieveScript,
  blockId: NodeId,
): BodyBlock[] | TopLevelBlock[] | null {
  // Check top-level
  if (script.blocks.some(b => b.id === blockId)) {
    return script.blocks;
  }
  // Recurse into if-blocks
  for (const block of script.blocks) {
    if (isIfBlock(block)) {
      const result = findParentBodyInIf(block, blockId);
      if (result) return result;
    }
  }
  return null;
}

function findParentBodyInIf(
  ifBlock: IfBlock,
  blockId: NodeId,
): BodyBlock[] | null {
  if (ifBlock.body.some(b => b.id === blockId)) return ifBlock.body;
  for (const b of ifBlock.body) {
    if (isIfBlock(b)) {
      const result = findParentBodyInIf(b, blockId);
      if (result) return result;
    }
  }
  for (const branch of ifBlock.branches) {
    if (branch.body.some(b => b.id === blockId)) return branch.body;
    for (const b of branch.body) {
      if (isIfBlock(b)) {
        const result = findParentBodyInIf(b, blockId);
        if (result) return result;
      }
    }
  }
  return null;
}

/** Find a block anywhere in the tree by id */
function findBlock(
  script: SieveScript,
  blockId: NodeId,
): TopLevelBlock | BodyBlock | null {
  for (const block of script.blocks) {
    if (block.id === blockId) return block;
    if (isIfBlock(block)) {
      const result = findBlockInIf(block, blockId);
      if (result) return result;
    }
  }
  return null;
}

function findBlockInIf(
  ifBlock: IfBlock,
  blockId: NodeId,
): BodyBlock | null {
  for (const b of ifBlock.body) {
    if (b.id === blockId) return b;
    if (isIfBlock(b)) {
      const result = findBlockInIf(b, blockId);
      if (result) return result;
    }
  }
  for (const branch of ifBlock.branches) {
    for (const b of branch.body) {
      if (b.id === blockId) return b;
      if (isIfBlock(b)) {
        const result = findBlockInIf(b, blockId);
        if (result) return result;
      }
    }
  }
  return null;
}

/** Find the body array for a given container id.
 *  Container ids: script root = script.id, IfBlock = block.id, branch = branch.id */
function findBodyById(
  script: SieveScript,
  containerId: NodeId,
): TopLevelBlock[] | BodyBlock[] | null {
  if (containerId === script.id) return script.blocks;
  for (const block of script.blocks) {
    if (isIfBlock(block)) {
      const result = findBodyInIf(block, containerId);
      if (result) return result;
    }
  }
  return null;
}

function findBodyInIf(
  ifBlock: IfBlock,
  containerId: NodeId,
): BodyBlock[] | null {
  // Accept both the raw if-block id and the ':body' droppable suffix
  if (ifBlock.id === containerId || ifBlock.id + ':body' === containerId) return ifBlock.body;
  for (const branch of ifBlock.branches) {
    if (branch.id === containerId) return branch.body;
  }
  for (const b of ifBlock.body) {
    if (isIfBlock(b)) {
      const result = findBodyInIf(b, containerId);
      if (result) return result;
    }
  }
  for (const branch of ifBlock.branches) {
    for (const b of branch.body) {
      if (isIfBlock(b)) {
        const result = findBodyInIf(b, containerId);
        if (result) return result;
      }
    }
  }
  return null;
}

// ─── Actions (mutate draft in-place via Immer) ────────────────────────────────

export function addBlock(
  script: SieveScript,
  containerId: NodeId,
  index: number,
  block: TopLevelBlock | BodyBlock,
): void {
  const body = findBodyById(script, containerId);
  if (!body) return;
  (body as (TopLevelBlock | BodyBlock)[]).splice(index, 0, block);
}

export function removeBlock(script: SieveScript, blockId: NodeId): void {
  const parent = findParentBody(script, blockId);
  if (!parent) return;
  const idx = (parent as { id: NodeId }[]).findIndex(b => b.id === blockId);
  if (idx !== -1) parent.splice(idx, 1);
}

export function moveBlock(
  script: SieveScript,
  blockId: NodeId,
  targetContainerId: NodeId,
  targetIndex: number,
): void {
  const block = findBlock(script, blockId);
  if (!block) return;
  // Remove from current location
  removeBlock(script, blockId);
  // Insert at new location
  const targetBody = findBodyById(script, targetContainerId);
  if (!targetBody) return;
  const clampedIndex = Math.min(targetIndex, targetBody.length);
  (targetBody as (TopLevelBlock | BodyBlock)[]).splice(clampedIndex, 0, block);
}

export function updateBlock(
  script: SieveScript,
  blockId: NodeId,
  patch: Partial<TopLevelBlock | BodyBlock>,
): void {
  const block = findBlock(script, blockId);
  if (!block) return;
  Object.assign(block, patch);
}

export function addBranch(
  script: SieveScript,
  ifBlockId: NodeId,
  kind: 'elsif' | 'else',
): void {
  const block = findBlock(script, ifBlockId);
  if (!block || !isIfBlock(block)) return;

  // Enforce: only one else, and else must be last
  const alreadyHasElse = block.branches.some(b => b.kind === 'else');
  if (kind === 'else' && alreadyHasElse) return;

  if (kind === 'elsif') {
    const elseIndex = block.branches.findIndex(b => b.kind === 'else');
    const insertAt = elseIndex === -1 ? block.branches.length : elseIndex;
    const branch: ElsifBlock = {
      id: newId(),
      kind: 'elsif',
      test: { id: newId(), kind: 'true' },
      body: [],
    };
    block.branches.splice(insertAt, 0, branch);
  } else {
    const branch: ElseBlock = { id: newId(), kind: 'else', body: [] };
    block.branches.push(branch);
  }
}

export function removeBranch(script: SieveScript, branchId: NodeId): void {
  for (const block of script.blocks) {
    if (isIfBlock(block)) {
      if (removeBranchFromIf(block, branchId)) return;
    }
  }
}

function removeBranchFromIf(ifBlock: IfBlock, branchId: NodeId): boolean {
  const idx = ifBlock.branches.findIndex(b => b.id === branchId);
  if (idx !== -1) {
    ifBlock.branches.splice(idx, 1);
    return true;
  }
  for (const b of ifBlock.body) {
    if (isIfBlock(b) && removeBranchFromIf(b, branchId)) return true;
  }
  for (const branch of ifBlock.branches) {
    for (const b of branch.body) {
      if (isIfBlock(b) && removeBranchFromIf(b, branchId)) return true;
    }
  }
  return false;
}

export function toggleCollapsed(script: SieveScript, ifBlockId: NodeId): void {
  const block = findBlock(script, ifBlockId);
  if (block && isIfBlock(block)) {
    block.collapsed = !block.collapsed;
  }
}

export function emptyScript(): SieveScript {
  return { id: newId(), blocks: [] };
}
