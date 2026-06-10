import React, { useMemo } from 'react';
import { Department, Destination } from '../types/content';
import { useTranslation } from '../hooks/useTranslation';

interface ExplorerProgressProps {
  departments: Department[];
  destinations: Destination[];
  completedActivities: Record<string, number[]> | undefined;
  navigate: (path: string) => void;
}

export const ExplorerProgress: React.FC<ExplorerProgressProps> = ({
  departments,
  destinations,
  completedActivities,
  navigate
}) => {
  const { t } = useTranslation();

  // Calculate progress per department
  const progressData = useMemo(() => {
    if (!departments.length || !destinations.length) return [];

    return departments.map(dept => {
      // Find all destinations for this department
      // We check both the document ID and the internal departmentId field for robustness
      const deptDestinations = destinations.filter(d => 
        d.departmentId === dept.id || (dept.departmentId && d.departmentId === dept.departmentId)
      );
      
      // Calculate total activities available
      const totalActivities = deptDestinations.reduce((sum, dest) => {
        // Ensure activities is an array before getting length
        const activities = Array.isArray(dest.activities) ? dest.activities : [];
        return sum + activities.length;
      }, 0);
      
      // If there are no activities in this department, we don't show a card
      if (totalActivities === 0) return null;

      // Calculate total completed activities by the user in this department
      const completedCount = deptDestinations.reduce((sum, dest) => {
        const completedForDest = completedActivities?.[dest.id] || [];
        return sum + completedForDest.length;
      }, 0);

      return {
        department: dept,
        total: totalActivities,
        completed: completedCount,
        percentage: (completedCount / totalActivities) * 100
      };
    }).filter(Boolean) as { department: Department; total: number; completed: number; percentage: number }[];
  }, [departments, destinations, completedActivities]);

  // Debug to verify data in console
  // console.log("ExplorerProgress:", { departments: departments.length, destinations: destinations.length, progressData: progressData.length });

  if (progressData.length === 0) {
    return (
      <div className="flex flex-col gap-3 px-5 opacity-40">
        <h3 className="text-base font-bold text-content px-1">
          {t('profile.explorerProgress')}
        </h3>
        <div className="bg-overlay/5 border border-overlay/10 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-content-subtle mb-2">lock</span>
          <p className="text-xs text-content-subtle">
            {t('profile.missionsPending')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5">
      <h3 className="text-base font-bold text-content px-1">
        {t('profile.explorerProgress')}
      </h3>
      
      <div className="grid grid-cols-1 gap-3">
        {progressData.map((data) => (
          <button
            key={data.department.id}
            onClick={() => navigate(`/department/${data.department.id}`)}
            className="relative w-full overflow-hidden rounded-2xl p-4 bg-surface-dark border border-overlay/10 flex flex-col gap-3 transition-all active:scale-[0.98] text-left hover:bg-overlay/5"
          >
            {/* Background Hint */}
            <div 
              className="absolute right-0 top-0 w-32 h-full opacity-10 bg-cover bg-left pointer-events-none"
              style={{ backgroundImage: `url("${data.department.heroImage}")`, maskImage: 'linear-gradient(to right, transparent, black)' }}
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">map</span>
                <p className="font-bold text-content text-sm leading-none">
                  {t('profile.activitiesIn')} {data.department.name}
                </p>
              </div>
              <div className="bg-primary/20 text-primary px-3 py-1 rounded-md text-xs font-bold border border-primary/30 whitespace-nowrap shrink-0 ml-2">
                {data.completed} / {data.total}
              </div>
            </div>

            <div className="relative z-10 w-full bg-overlay/10 rounded-full h-1.5 overflow-hidden border border-overlay/5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${data.percentage}%` }}
              />
            </div>
            
            {data.percentage === 100 && (
              <div className="absolute top-0 right-0 w-full h-full border-2 border-primary/50 rounded-2xl pointer-events-none animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
