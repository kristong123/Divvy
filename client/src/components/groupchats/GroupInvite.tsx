import React, { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { toast } from "react-hot-toast";
import {
  removeGroupInvite,
  setInviteStatus,
  InviteStatus,
} from "../../store/slice/groupSlice";
import { RootState } from "../../store/store";
import { getSocket, showUniqueToast } from "../../services/socketService";
import { useTheme } from '../../context/ThemeContext'; // Import useTheme

interface GroupInviteProps {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  messageId?: string;
  onAccept?: (inviteId: string) => void;
}

const GroupInvite: React.FC<GroupInviteProps> = ({
  id,
  groupId,
  groupName,
  invitedBy,
  onAccept,
}) => {
  const { theme } = useTheme();  // Use the theme context
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.username);

  // Determine if the current user is the sender of the invite
  const isSender = currentUser === invitedBy;

  // Use a safe default value and add a null check
  const inviteStatus = useSelector((state: RootState) =>
    state.groups.inviteStatus && id ? state.groups.inviteStatus[id] : "loading"
  ) as InviteStatus;

  // Add a state to track failed status checks
  const [statusCheckFailed, setStatusCheckFailed] = useState(false);

  // Keep track of invites we've already checked
  const [checkedInvites, setCheckedInvites] = useState<Set<string>>(new Set());

  // Function to check if user is already a member of the group
  const checkGroupMembership =
    useCallback(async (): Promise<InviteStatus | null> => {
      try {
        console.log(`Checking group status for group ${groupId}`);
        const groupResponse = await axios.get(
          `${BASE_URL}/api/groups/${groupId}/status?username=${currentUser}`
        );

        if (!groupResponse.data.exists) {
          return "invalid";
        } else if (groupResponse.data.isMember) {
          return "already_member";
        }
        return "valid";
      } catch (error) {
        console.error("Error checking group membership:", error);
        return null;
      }
    }, [groupId, currentUser]);

  // Check the invite status from the server
  const checkInviteStatus = useCallback(async () => {
    // Skip if we've already checked this invite
    if (id && checkedInvites.has(id)) {
      console.log(
        `Skipping duplicate check for invite ${id} - already checked`
      );
      return;
    }

    // Mark this invite as checked
    if (id) {
      setCheckedInvites((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    }

    try {
      // Skip server check if we've already tried and failed
      if (statusCheckFailed) {
        console.log(
          `Skipping server status check for invite ${id} due to previous failures`
        );
        // Set to valid if not already set
        if (inviteStatus === "loading") {
          dispatch(setInviteStatus({ inviteId: id, status: "valid" }));
        }
        return;
      }

      try {
        // Fetch the invite status from the database
        console.log(`Fetching invite status for invite ${id}`);
        const response = await axios.get(
          `${BASE_URL}/api/groups/invites/${id}/status?username=${currentUser}`
        );

        if (response.data && response.data.status) {
          // If the server has a saved status, use it
          console.log(`Server returned invite status: ${response.data.status}`);
          dispatch(
            setInviteStatus({
              inviteId: id,
              status: response.data.status,
            })
          );
          return;
        }
      } catch (statusError) {
        console.error("Error fetching invite status:", statusError);
        // Mark status check as failed to avoid repeated failures
        setStatusCheckFailed(true);
      }

      // If we get here, either there's no saved status or there was an error
      // Check if the user is already a member of the group
      const status = await checkGroupMembership();
      if (status) {
        console.log(`Setting invite status to: ${status}`);
        dispatch(setInviteStatus({ inviteId: id, status }));
      }
    } catch (error) {
      console.error("Error checking invite status:", error);
      // Only set to invalid if not already accepted or declined
      if (inviteStatus !== "accepted" && inviteStatus !== "declined" && inviteStatus !== "sent") {
        // Set to valid instead of invalid to allow the user to try accepting/declining
        dispatch(setInviteStatus({ inviteId: id, status: "valid" }));
      }
    }
  }, [
    id,
    checkedInvites,
    statusCheckFailed,
    inviteStatus,
    dispatch,
    currentUser,
    checkGroupMembership,
  ]);

  // Check invite status when component mounts or when inviteStatus changes to loading
  useEffect(() => {
    if (inviteStatus === "loading") {
      checkInviteStatus();
    }
  }, [inviteStatus, checkInviteStatus]);

  // Listen for socket events that might affect the invite status
  useEffect(() => {
    const socket = getSocket();

    // Group was deleted
    const handleGroupDeleted = (data: { groupId: string }) => {
      if (data.groupId === groupId) {
        // Only update if not already accepted or declined
        if (inviteStatus !== "accepted" && inviteStatus !== "declined") {
          dispatch(setInviteStatus({ inviteId: id, status: "invalid" }));
        }
      }
    };

    // User was added to the group
    const handleUserAddedToGroup = (data: { groupId: string }) => {
      if (data.groupId === groupId) {
        // Only update if not already accepted or declined
        if (inviteStatus !== "accepted" && inviteStatus !== "declined") {
          dispatch(setInviteStatus({ inviteId: id, status: "already_member" }));
        }
      }
    };

    // User was removed from the group
    const handleUserRemovedFromGroup = (data: { groupId: string }) => {
      if (
        data.groupId === groupId &&
        inviteStatus !== "declined" &&
        inviteStatus !== "accepted"
      ) {
        dispatch(setInviteStatus({ inviteId: id, status: "valid" }));
      }
    };

    socket.on("group-deleted", handleGroupDeleted);
    socket.on("user-added-to-group", handleUserAddedToGroup);
    socket.on("user-removed-from-group", handleUserRemovedFromGroup);

    return () => {
      socket.off("group-deleted", handleGroupDeleted);
      socket.off("user-added-to-group", handleUserAddedToGroup);
      socket.off("user-removed-from-group", handleUserRemovedFromGroup);
    };
  }, [groupId, inviteStatus, dispatch, id]);

  const container = clsx(
    // Layout
    "flex flex-col",
    // Spacing
    "p-3",
    // Appearance
     theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-black",
    // Width
    "w-fit"
  );

  const title = clsx(
    // Typography
    'text-sm font-semibold text-black',
    theme === "dark" ? "text-white" : "text-black"
  );

  const description = clsx(
    // Typography
    'text-sm text-gray-600',
    theme === "dark" ? "text-gray-300" : "text-gray-600"
  );

  const buttonContainer = clsx(
    // Layout
    "flex gap-2 mt-2"
  );

  // Determine if the invite is interactive based on its status
  // Allow interaction for both "valid" and "sent" statuses
  const isInteractive = inviteStatus === "valid" || inviteStatus === "sent";

  const acceptButton = clsx(
    'px-3 py-1 text-sm font-medium rounded-md transition-colors duration-300',
    inviteStatus === 'valid'
      ? theme === "dark" 
        ? "bg-[#57E3DC] text-black cursor-pointer hover:bg-[#47c5bf]"
        : "bg-[#57E3DC] text-white cursor-pointer hover:bg-[#47c5bf]"
      : "bg-gray-500 text-gray-300 cursor-not-allowed"
  );

  const declineButton = clsx(
    'px-3 py-1 text-sm font-medium rounded-md transition-colors duration-300',
    inviteStatus === 'valid'
      ? theme === "dark"
        ? "bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600"
        : "bg-gray-300 text-gray-700 cursor-pointer hover:bg-gray-200"
      : "bg-gray-500 text-gray-300 cursor-not-allowed"
  );

  const handleAccept = async () => {
    if (!isInteractive) {
      console.log(`Cannot accept invite with status: ${inviteStatus}`);
      return;
    }

    try {
      // Update local state first for immediate UI feedback
      console.log(`Setting invite status to accepted for invite ${id}`);
      dispatch(setInviteStatus({ inviteId: id, status: "accepted" }));

      // Make the API call to join the group and update invite status
      console.log(`Sending join request for group ${groupId}, invite ${id}`);
      const response = await axios.post(`${BASE_URL}/api/groups/join`, {
        groupId,
        username: currentUser,
        inviteId: id,
        inviteStatus: "accepted", // Explicitly send the status to update in the database
      });

      // Only call onAccept if the API call was successful
      if (response.status === 200) {
        console.log(`Successfully joined group ${groupId}`);
        try {
          onAccept && onAccept(id);
        } catch (callbackError) {
          console.error("Error in onAccept callback:", callbackError);
          // Don't revert status on callback errors
        }

        // Don't show a toast notification here - it will be shown by the socket event handler
        console.log(`✅ Successfully joined group: ${groupName}`);
      }
    } catch (error) {
      console.error("Failed to join group:", error);

      // Log more detailed error information
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server response:", error.response.data);
        console.error("Status code:", error.response.status);
      }

      // Revert to valid status
      dispatch(setInviteStatus({ inviteId: id, status: "valid" }));
      toast.error("Failed to join group");
    }
  };

  const handleDecline = async () => {
    if (!isInteractive) {
      console.log(`Cannot decline invite with status: ${inviteStatus}`);
      return;
    }

    try {
      // Update local state first for immediate UI feedback
      console.log(`Setting invite status to declined for invite ${id}`);
      dispatch(setInviteStatus({ inviteId: id, status: "declined" }));

      // Make API call to update invite status in the database
      console.log(`Sending decline request for invite ${id}`);
      await axios.post(`${BASE_URL}/api/groups/invites/decline`, {
        inviteId: id,
        username: currentUser,
        inviteStatus: "declined", // Explicitly send the status to update in the database
      });

      // Remove from Redux store
      console.log(`Removing invite ${id} from Redux store`);
      dispatch(
        removeGroupInvite({
          username: currentUser,
          inviteId: id,
        })
      );

      // Use a unique key for the toast notification
      const notificationKey = `decline-invite-${id}-${Date.now()
        .toString()
        .slice(0, -3)}`;
      showUniqueToast(notificationKey, `Declined invitation to ${groupName}`);
      console.log(`✅ Successfully declined invitation to ${groupName}`);
    } catch (error) {
      console.error("Failed to decline invite:", error);

      // Log more detailed error information
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server response:", error.response.data);
        console.error("Status code:", error.response.status);
      }

      // Revert to valid status if the API call fails
      dispatch(setInviteStatus({ inviteId: id, status: "valid" }));
      toast.error("Failed to decline invitation");
    }
  };

  // Get status message based on invite status
  const getStatusMessage = () => {
    switch (inviteStatus) {
      case "loading":
        return `Loading invite status...`;
      case "invalid":
        return `This invite is no longer valid`;
      case "accepted":
        return `You've accepted this invite`;
      case "declined":
        return `You've declined this invite`;
      case "already_member":
        return `You're already a member of ${groupName}`;
      case "valid":
        return `You've been invited to join ${groupName}`;
      case "sent":
        return `You've been invited to join ${groupName}`;
      default:
        // Don't update state during render - use useEffect instead
        return `You've been invited to join ${groupName}`;
    }
  };

  // Force a status check if the component renders with an undefined status
  useEffect(() => {
    if (inviteStatus === undefined) {
      dispatch(setInviteStatus({ inviteId: id, status: "loading" }));
    }
  }, [id, inviteStatus, dispatch]);

  // Get button text based on status
  const getAcceptButtonText = () => {
    switch (inviteStatus) {
      case "accepted":
        return "Accepted";
      case "already_member":
        return "Already Joined";
      default:
        return "Accept";
    }
  };

  const getDeclineButtonText = () => {
    return inviteStatus === "declined" ? "Declined" : "Decline";
  };

  return (
    <div className={container}>
      <span className={title}>Group Invite</span>
      <p className={description}>{getStatusMessage()}</p>
      {!isSender && (
        <div className={buttonContainer}>
          <button
            className={acceptButton}
            onClick={handleAccept}
            disabled={!isInteractive}
          >
            {getAcceptButtonText()}
          </button>
          <button
            className={declineButton}
            onClick={handleDecline}
            disabled={!isInteractive}
          >
            {getDeclineButtonText()}
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupInvite;
