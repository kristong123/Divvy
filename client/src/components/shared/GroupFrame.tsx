import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface GroupFrameProps {
  groupId: string;
  size?: number;
  className?: string;
}

const GroupFrame: React.FC<GroupFrameProps> = ({
  groupId,
  size = 32,
  className = "",
}) => {
  // Get group data from Redux store
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);

  const groupName = group?.name || "Group";
  const imageUrl = group?.imageUrl || null;

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    e.currentTarget.src = "";
    toast.error(`Failed to load ${groupName}'s image`);
  };

  const getInitials = (name: string) => {
    if (!name) return "G";
    const parts = name.split(" ");
    return parts.map((part) => part.charAt(0)).join("");
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-[#57E3DC] to-[#4DC8C2] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      data-groupid={groupId}
    >
      {imageUrl ? (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={groupName}
          className="absolute inset-0 m-auto w-[90%] h-[90%] object-cover rounded-2xl"
          onError={handleImageError}
        />
      ) : (
        <div className="flex items-center rounded-2xl justify-center w-[90%] h-[90%] bg-slate-300">
          <span className="text-white">{getInitials(groupName)}</span>
        </div>
      )}
    </div>
  );
};

export default GroupFrame;
