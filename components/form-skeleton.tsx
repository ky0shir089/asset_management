import { Skeleton } from "@/components/ui/skeleton";

const FormSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-12 h-4" />
        <Skeleton className="w-full h-10" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-10 h-4" />
        <Skeleton className="w-full h-10" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-16 h-4" />
        <Skeleton className="w-full h-10" />
      </div>

      <Skeleton className="w-full h-10" />
    </div>
  );
};

export default FormSkeleton;