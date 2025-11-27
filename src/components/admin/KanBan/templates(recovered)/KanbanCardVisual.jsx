export default function KanbanCardVisual({ title, subtitle, avatar, labels = [], comments = 0, checklistDone = 0, checklistTotal = 0 }) {
  return (
    <div
      className="group relative p-3 rounded-lg border border-gray-300 bg-white 
        shadow-sm hover:shadow-lg hover:scale-[1.001] 
        transition-transform select-none flex flex-col 
        justify-between space-y-2 ml-2 mr-2 mb-4"
    >
      {/* Topo com Avatar + Título */}
      <div className="flex justify-between items-start">
        <div>
          {avatar ? (
            <img
              src={avatar}
              className="w-10 h-10 border border-gray-300 rounded-full object-cover 
              transition-transform hover:scale-[1.05] ring-2 ring-black"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full">
              ?
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-1 flex-1 min-w-0 ml-3">
          <div className="text-sm font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis w-full mt-1">
            {title}
          </div>

          {subtitle && (
            <div className="text-xs text-gray-500 truncate max-w-[200px] overflow-hidden whitespace-nowrap">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center pt-1 border-t space-x-2 mt-1">
        <div className="px-2 py-[2px] text-xs rounded-full 
                        bg-blue-100 text-blue-700
                        transition-transform hover:scale-[1.1]">
          💬 {comments}
        </div>

        <div className="text-xs text-gray-600 transition-transform hover:scale-[1.1]">
          ✅ {checklistDone}/{checklistTotal}
        </div>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pt-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {labels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
              style={{ backgroundColor: label.color, color: "#fff" }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
