import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAssetUrl } from '../utils/urlHelper';

interface PlaylistQueueProps {
    assets: any[];
    currentIndex: number;
    onReorder: (newAssets: any[]) => void;
    onJumpTo: (index: number) => void;
    onShuffle: () => void;
}

const SortableItem = ({ asset, isActive, onClick }: { asset: any, isActive: boolean, onClick: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: asset.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as 'relative', // Typescript fix
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-2 rounded flex gap-3 items-center transition-all border group ${isActive ? 'bg-cyan-500/10 border-cyan-500/30' : 'border-transparent hover:bg-white/5'}`}
        >
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 p-1">
                ⋮⋮
            </div>

            {/* Click to Play */}
            <div onClick={onClick} className="flex-1 flex gap-3 items-center cursor-pointer overflow-hidden">
                <div className="w-10 h-10 bg-black/40 rounded overflow-hidden flex-shrink-0 flex items-center justify-center pointer-events-none">
                    {asset.type === 'image' ? <img src={getAssetUrl(asset.url)} className="w-full h-full object-cover opacity-70" /> : <span className="text-xs">{(asset.type === 'video' ? '🎬' : (asset.type === 'audio' ? '🎵' : 'GIF'))}</span>}
                </div>
                <div className="flex-1 min-w-0 pointer-events-none">
                    <div className={`text-sm font-medium truncate ${isActive ? 'text-cyan-400' : 'text-white/80'}`}>{asset.name || 'Untitled'}</div>
                    <div className="text-[10px] text-white/30 truncate">{asset.type}</div>
                </div>
                {isActive && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse pointer-events-none"></div>}
            </div>
        </div>
    );
};

const PlaylistQueue: React.FC<PlaylistQueueProps> = ({ assets, currentIndex, onReorder, onJumpTo, onShuffle }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = assets.findIndex((item) => item.id === active.id);
            const newIndex = assets.findIndex((item) => item.id === over.id);

            // Important: We need a new array
            const newAssets = arrayMove(assets, oldIndex, newIndex);
            onReorder(newAssets);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-sm font-bold tracking-widest text-white/70">PLAYLIST QUEUE</h2>
                <button
                    onClick={onShuffle}
                    className="p-1 px-2 text-xs bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 rounded transition-colors"
                    title="Shuffle Playlist"
                >
                    🔀 Shuffle
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={assets.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {assets.map((asset, idx) => (
                            <SortableItem
                                key={asset.id}
                                asset={asset}
                                isActive={currentIndex === idx}
                                onClick={() => onJumpTo(idx)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {assets.length === 0 && <div className="text-center text-white/30 py-10 text-sm">Select a phase to load playlist</div>}
            </div>
        </div>
    );
};

export default PlaylistQueue;
