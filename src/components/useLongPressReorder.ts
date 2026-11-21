'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { moveItem } from '@/lib/reorder';

const HOLD_DURATION_MS = 1000;
const CHARGE_DELAY_MS = 180;
const MOVE_CANCEL_THRESHOLD_PX = 10;
const EDGE_SCROLL_ZONE_PX = 72;
const EDGE_SCROLL_SPEED_PX = 8;

interface ActiveSession {
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  anchorY: number;
  lastClientY: number;
  offsetY: number;
  isDragging: boolean;
  initialIds: string[];
  currentIds: string[];
  prevBodyUserSelect: string;
}

export interface UseLongPressReorderOptions<T extends { id: string }> {
  items: readonly T[];
  onReorder: (orderedIds: string[]) => void;
}

export function useLongPressReorder<T extends { id: string }>({
  items,
  onReorder,
}: UseLongPressReorderOptions<T>) {
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [liveIds, setLiveIds] = useState<string[] | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const sessionRef = useRef<ActiveSession | null>(null);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pendingLayoutCommitRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const registerItemRef = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element) {
        itemRefs.current.set(id, element);
      } else {
        itemRefs.current.delete(id);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    pendingLayoutCommitRef.current = false;
  }, [liveIds]);

  const clearTimers = useCallback(() => {
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  const preventTouchMove = useCallback((event: TouchEvent) => {
    if (sessionRef.current?.isDragging && event.cancelable) {
      event.preventDefault();
    }
  }, []);

  const trySwapWithNeighbor = useCallback((session: ActiveSession) => {
    if (pendingLayoutCommitRef.current) {
      return;
    }

    const draggedEl = itemRefs.current.get(session.itemId);
    if (!draggedEl) {
      return;
    }

    const currentIdx = session.currentIds.indexOf(session.itemId);
    if (currentIdx === -1) {
      return;
    }

    const draggedRect = draggedEl.getBoundingClientRect();
    const draggedCenterY = draggedRect.top + draggedRect.height / 2;

    if (currentIdx > 0) {
      const prevId = session.currentIds[currentIdx - 1];
      const prevEl = itemRefs.current.get(prevId);
      if (prevEl) {
        const prevRect = prevEl.getBoundingClientRect();
        const prevMidY = prevRect.top + prevRect.height / 2;
        if (draggedCenterY < prevMidY) {
          const naturalTop = draggedRect.top - session.offsetY;
          const delta = -(naturalTop - prevRect.top);
          session.anchorY += delta;
          session.offsetY = session.lastClientY - session.anchorY;
          session.currentIds = moveItem(
            session.currentIds,
            currentIdx,
            currentIdx - 1,
          );
          pendingLayoutCommitRef.current = true;
          setLiveIds([...session.currentIds]);
          setDragOffsetY(session.offsetY);
          return;
        }
      }
    }

    if (currentIdx < session.currentIds.length - 1) {
      const nextId = session.currentIds[currentIdx + 1];
      const nextEl = itemRefs.current.get(nextId);
      if (nextEl) {
        const nextRect = nextEl.getBoundingClientRect();
        const nextMidY = nextRect.top + nextRect.height / 2;
        if (draggedCenterY > nextMidY) {
          const naturalBottom = draggedRect.bottom - session.offsetY;
          const delta = nextRect.bottom - naturalBottom;
          session.anchorY += delta;
          session.offsetY = session.lastClientY - session.anchorY;
          session.currentIds = moveItem(
            session.currentIds,
            currentIdx,
            currentIdx + 1,
          );
          pendingLayoutCommitRef.current = true;
          setLiveIds([...session.currentIds]);
          setDragOffsetY(session.offsetY);
        }
      }
    }
  }, []);

  const cleanupSession = useCallback(
    (commitReorder: boolean) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      clearTimers();
      stopAutoScroll();
      window.removeEventListener('touchmove', preventTouchMove);

      if (session?.isDragging) {
        document.body.style.userSelect = session.prevBodyUserSelect;
        suppressClickUntilRef.current = Date.now() + 250;

        const changed =
          commitReorder &&
          session.currentIds.some(
            (id, index) => id !== session.initialIds[index],
          );
        const finalIds = [...session.currentIds];

        setDraggingId(null);
        setDragOffsetY(0);
        setLiveIds(null);
        setChargingId(null);

        if (changed) {
          onReorderRef.current(finalIds);
        }
      } else {
        setChargingId(null);
        setDraggingId(null);
        setDragOffsetY(0);
        setLiveIds(null);
      }
    },
    [clearTimers, preventTouchMove, stopAutoScroll],
  );

  useEffect(() => {
    function startAutoScrollLoop() {
      if (scrollRafRef.current !== null) {
        return;
      }
      const step = () => {
        const session = sessionRef.current;
        if (!session || !session.isDragging) {
          scrollRafRef.current = null;
          return;
        }
        const y = session.lastClientY;
        let scrollDelta = 0;
        if (y < EDGE_SCROLL_ZONE_PX && window.scrollY > 0) {
          scrollDelta = -EDGE_SCROLL_SPEED_PX;
        } else if (
          y > window.innerHeight - EDGE_SCROLL_ZONE_PX &&
          window.scrollY + window.innerHeight <
          document.documentElement.scrollHeight
        ) {
          scrollDelta = EDGE_SCROLL_SPEED_PX;
        }

        if (scrollDelta !== 0) {
          const prevScrollY = window.scrollY;
          window.scrollBy(0, scrollDelta);
          const actualDelta = window.scrollY - prevScrollY;
          if (actualDelta !== 0) {
            session.anchorY -= actualDelta;
            session.offsetY = session.lastClientY - session.anchorY;
            setDragOffsetY(session.offsetY);
            trySwapWithNeighbor(session);
          }
        }
        scrollRafRef.current = requestAnimationFrame(step);
      };
      scrollRafRef.current = requestAnimationFrame(step);
    }

    function handleWindowPointerMove(event: globalThis.PointerEvent) {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      session.lastClientY = event.clientY;

      if (!session.isDragging) {
        const distance = Math.hypot(
          event.clientX - session.startX,
          event.clientY - session.startY,
        );
        if (distance > MOVE_CANCEL_THRESHOLD_PX) {
          cleanupSession(false);
        }
        return;
      }

      session.offsetY = event.clientY - session.anchorY;
      setDragOffsetY(session.offsetY);
      trySwapWithNeighbor(session);

      if (
        event.clientY < EDGE_SCROLL_ZONE_PX ||
        event.clientY > window.innerHeight - EDGE_SCROLL_ZONE_PX
      ) {
        startAutoScrollLoop();
      }
    }

    function handleWindowPointerUpOrCancel(event: globalThis.PointerEvent) {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      cleanupSession(event.type === 'pointerup');
    }

    window.addEventListener('pointermove', handleWindowPointerMove, {
      passive: true,
    });
    window.addEventListener('pointerup', handleWindowPointerUpOrCancel);
    window.addEventListener('pointercancel', handleWindowPointerUpOrCancel);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUpOrCancel);
      window.removeEventListener('pointercancel', handleWindowPointerUpOrCancel);
      cleanupSession(false);
    };
  }, [cleanupSession, trySwapWithNeighbor]);

  const handlePointerDown = useCallback(
    (itemId: string, event: PointerEvent<HTMLElement>) => {
      if (itemsRef.current.length < 2) {
        return;
      }
      if (!event.isPrimary) {
        return;
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [data-no-drag]')) {
        return;
      }

      cleanupSession(false);

      const session: ActiveSession = {
        itemId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        anchorY: event.clientY,
        lastClientY: event.clientY,
        offsetY: 0,
        isDragging: false,
        initialIds: [],
        currentIds: [],
        prevBodyUserSelect: document.body.style.userSelect,
      };
      sessionRef.current = session;

      chargeTimerRef.current = setTimeout(() => {
        if (sessionRef.current === session && !session.isDragging) {
          setChargingId(itemId);
        }
      }, CHARGE_DELAY_MS);

      holdTimerRef.current = setTimeout(() => {
        if (sessionRef.current !== session) {
          return;
        }

        const currentIds = itemsRef.current.map((item) => item.id);
        if (!currentIds.includes(itemId) || currentIds.length < 2) {
          cleanupSession(false);
          return;
        }

        session.isDragging = true;
        session.initialIds = [...currentIds];
        session.currentIds = [...currentIds];
        session.anchorY = session.lastClientY;
        session.offsetY = 0;

        document.body.style.userSelect = 'none';
        try {
          window.getSelection()?.removeAllRanges();
        } catch {
          // Bỏ qua lỗi trình duyệt hạn chế getSelection
        }
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.vibrate === 'function'
        ) {
          navigator.vibrate(25);
        }

        window.addEventListener('touchmove', preventTouchMove, {
          passive: false,
        });

        setChargingId(null);
        setDraggingId(itemId);
        setDragOffsetY(0);
        setLiveIds(currentIds);
      }, HOLD_DURATION_MS);
    },
    [cleanupSession, preventTouchMove],
  );

  const getItemPointerHandlers = useCallback(
    (itemId: string) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) =>
        handlePointerDown(itemId, event),
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        const session = sessionRef.current;
        if (session && session.itemId === itemId) {
          event.preventDefault();
        }
      },
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    }),
    [handlePointerDown],
  );

  const displayItems = useMemo(() => {
    if (!liveIds) {
      return [...items];
    }
    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = liveIds
      .map((id) => byId.get(id))
      .filter((item): item is T => item !== undefined);
    if (ordered.length !== items.length) {
      return [...items];
    }
    return ordered;
  }, [items, liveIds]);

  return {
    displayItems,
    chargingId,
    draggingId,
    dragOffsetY,
    registerItemRef,
    getItemPointerHandlers,
  };
}
