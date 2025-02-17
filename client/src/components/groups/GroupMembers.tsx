import React from 'react';
import clsx from 'clsx';
import ProfileAvatar from '../shared/ProfileAvatar';

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
  adminUsername = '' // Add default empty string
}) => {
  const container = clsx(
    // Layout
    'w-64 h-full',
    // Border
    'border-l border-divider',
    // Spacing
    'p-4'
  );

  const title = clsx(
    // Typography
    'text-lg font-bold text-black',
    // Spacing
    'mb-4'
  );

  const memberItem = clsx(
    // Layout
    'flex items-center',
    // Spacing
    'mb-3'
  );

  const memberName = clsx(
    // Typography
    'text-sm text-black',
    // Spacing
    'ml-2'
  );

  const adminBadge = clsx(
    // Layout
    'ml-2 px-2 py-0.5',
    // Appearance
    'bg-[#57E3DC] rounded-full',
    // Typography
    'text-xs text-white'
  );

  // Add error checking
  if (!Array.isArray(members)) {
    return <div className={container}>Loading members...</div>;
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
          <ProfileAvatar
            username={member.username}
            imageUrl={member.profilePicture}
            size="sm"
          />
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