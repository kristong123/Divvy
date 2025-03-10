import React from "react";
import clsx from "clsx";
import ProfileFrame from "../shared/ProfileFrame";
import { useTheme } from '../../context/ThemeContext';

interface Member {
  username: string;
  profilePicture?: string | null;
  isAdmin?: boolean;
}

interface GroupMembersProps {
  members: Member[];
  adminUsername: string;
}

const GroupMembers: React.FC<GroupMembersProps> = ({
  members = [], // Add default empty array
  adminUsername = "", // Add default empty string
}) => {
  const { theme } = useTheme();

  const container = clsx(
    // Layout
    "w-64 h-full",
    // Border
    theme === "dark" 
      ? "border-l border-gray-700" 
      : "border-l border-divider",
    // Background
    theme === "dark" ? "bg-gray-800" : "bg-white",
    // Spacing
    "p-4"
  );

  const title = clsx(
    // Typography
    "text-lg font-bold",
    theme === "dark" ? "text-white" : "text-black",
    // Spacing
    "mb-4"
  );

  const memberItem = clsx(
    // Layout
    "flex items-center",
    // Spacing
    "mb-1",
    // Hover effect
    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50",
    "rounded-lg p-2 transition-colors"
  );

  const memberName = clsx(
    // Typography
    "text-sm",
    theme === "dark" ? "text-gray-200" : "text-black",
    // Spacing
    "ml-2"
  );

  const adminBadge = clsx(
    // Layout
    "ml-2 px-2 py-0.5",
    // Appearance
    "bg-[#57E3DC] rounded-full",
    // Typography
    theme === "dark" ? "text-black" : "text-white"
  );

  // Add error checking
  if (!Array.isArray(members)) {
    return (
      <div className={clsx(
        container,
        theme === "dark" ? "text-gray-400" : "text-gray-600"
      )}>
        Loading members...
      </div>
    );
  }

  return (
    <div className={container}>
      <h2 className={title}>Members ({members.length})</h2>
      {members.map((member, index) => (
        <div
          // Use combination of username and index as key for extra uniqueness
          key={`${member.username}-${index}`}
          className={memberItem}
        >
          <ProfileFrame username={member.username} size={32} />
          <span className={memberName}>
            {member.username}
            {member.username === adminUsername && (
              <span className={adminBadge}>Admin</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export default React.memo(GroupMembers);
