export default function DeveloperCard({ dev }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 flex flex-col h-full">
      {/* Аватар (если есть) */}
      {dev.avatar && (
        <img 
          src={dev.avatar} 
          alt={dev.name} 
          className="w-16 h-16 rounded-full mb-4 object-cover flex-shrink-0 mx-auto"
        />
      )}
      
      {/* Основная информация */}
      <div className="flex-grow">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {dev.name}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {dev.role}
        </p>
        {dev.bio && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {dev.bio}
          </p>
        )}
      </div>
      
      {/* Навыки (если есть) */}
      {dev.skills && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {dev.skills.split(',').map((skill, idx) => (
              <span 
                key={idx} 
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
              >
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
