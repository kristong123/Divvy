import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import ProfileAvatar from "../../shared/ProfileAvatar";
import { toast } from "react-hot-toast";
import VenmoIcon from "../../shared/VenmoIcon";
import { updateExpense, removeExpense } from "../../../services/socketService";
import { markAsRead } from "../../../store/slice/notificationsSlice";

interface ExpenseBreakdownProps {
  groupId: string;
}

interface EditingState {
  payerId: string;
  debtorId: string;
  itemIndex: number;
  field: "name" | "amount";
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ groupId }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);
  const expenses = group?.currentEvent?.expenses || [];

  // Move this to component level
  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );

  const dispatch = useDispatch();

  // State for tracking which item is being edited
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Add this to get the group name
  const groupName = useSelector(
    (state: RootState) => state.groups.groups[groupId]?.name || "Group"
  );
  const eventTitle = useSelector(
    (state: RootState) =>
      state.groups.groups[groupId]?.currentEvent?.title || "Event"
  );

  // Handle Venmo payment - remove the useSelector from inside this function
  const handleVenmoPayment = (recipient: string, amount: number) => {
    const recipientData = group?.users.find((u) => u.username === recipient);

    if (!recipientData?.venmoUsername) {
      toast.error(`${recipient} hasn't set their Venmo username yet.`);
      return;
    }

    // Use notifications from component scope instead of calling useSelector here
    const relatedNotifications = notifications.filter(
      (n) =>
        n.data?.groupId === groupId && n.data?.sender === recipient && !n.read
    );

    // Mark these notifications as read
    relatedNotifications.forEach((notification) => {
      dispatch(markAsRead(notification.id));
    });

    const encodedUsername = encodeURIComponent(recipientData.venmoUsername);
    const venmoUrl = `https://account.venmo.com/pay?audience=private&amount=${amount.toFixed(
      2
    )}&note=${encodeURIComponent(
      `Payment for ${eventTitle} in ${groupName}`
    )}&recipients=${encodedUsername}`;
    window.open(venmoUrl, "_blank");
  };

  // Start editing an item
  const startEditing = (
    payerId: string,
    debtorId: string,
    itemIndex: number,
    field: "name" | "amount",
    currentValue: string
  ) => {
    setEditing({ payerId, debtorId, itemIndex, field });
    setEditValue(currentValue);
  };

  // Save edited item
  const saveEdit = () => {
    if (!editing || !group?.currentEvent) return;

    const { payerId, itemIndex, field } = editing;

    // Find the original expense
    const expenseToUpdate = expenses.find(
      (exp) =>
        exp.paidBy === payerId &&
        exp.item ===
          expensesByPayer[payerId].owedBy[editing.debtorId].items[itemIndex]
            .item
    );

    if (!expenseToUpdate) {
      toast.error("Couldn't find the expense to update");
      setEditing(null);
      return;
    }

    // Get the current value
    const currentValue =
      field === "name"
        ? expenseToUpdate.item
        : expenseToUpdate.amount.toString();

    // Check if the value is empty
    if (!editValue.trim()) {
      toast.error(
        `${field === "name" ? "Item name" : "Amount"} cannot be empty`
      );
      setEditing(null);
      return;
    }

    // Check if the value hasn't changed
    if (field === "name") {
      if (editValue === currentValue) {
        setEditing(null);
        return;
      }
    } else if (field === "amount") {
      // For amount, compare as numbers to avoid string vs number issues
      const newAmount = parseFloat(editValue);
      if (newAmount === expenseToUpdate.amount) {
        setEditing(null);
        return;
      }
    }

    // Create updated expense
    const updatedExpense = { ...expenseToUpdate };

    if (field === "name") {
      updatedExpense.item = editValue;
    } else if (field === "amount") {
      const newAmount = parseFloat(editValue);
      if (isNaN(newAmount) || newAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      updatedExpense.amount = newAmount;
    }

    // Update the expense
    updateExpense(groupId, updatedExpense);
    toast.success("Expense updated");
    setEditing(null);
  };

  // Handle key press in edit input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setEditing(null);
    }
  };

  // Delete an expense
  const handleDeleteExpense = (
    payerId: string,
    debtorId: string,
    itemIndex: number
  ) => {
    if (!group?.currentEvent) return;

    const itemToDelete =
      expensesByPayer[payerId].owedBy[debtorId].items[itemIndex];

    // Find the original expense
    const expenseToDelete = expenses.find(
      (exp) => exp.paidBy === payerId && exp.item === itemToDelete.item
    );

    if (!expenseToDelete) {
      toast.error("Couldn't find the expense to delete");
      return;
    }

    // Remove the expense
    removeExpense(groupId, expenseToDelete);
    toast.success("Expense removed");
  };

  // Calculate all expense breakdowns by payer
  const expensesByPayer = useMemo(() => {
    const result: Record<
      string,
      {
        totalPaid: number;
        owedBy: Record<
          string,
          {
            total: number;
            items: Array<{
              item: string;
              amount: number;
            }>;
          }
        >;
      }
    > = {};

    // Initialize structure for each user
    group?.users.forEach((user) => {
      result[user.username] = {
        totalPaid: 0,
        owedBy: {},
      };

      // Initialize owed structure for each other user
      group.users.forEach((otherUser) => {
        if (user.username !== otherUser.username) {
          result[user.username].owedBy[otherUser.username] = {
            total: 0,
            items: [],
          };
        }
      });
    });

    // Process each expense
    expenses.forEach((expense) => {
      const paidBy = expense.paidBy;
      const splitBetween = expense.splitBetween;
      const amountPerPerson = expense.amount / splitBetween.length;

      // Update total paid by this person
      result[paidBy].totalPaid += expense.amount;

      // Calculate what each person owes the payer
      splitBetween.forEach((person) => {
        if (person !== paidBy) {
          result[paidBy].owedBy[person].total += amountPerPerson;
          result[paidBy].owedBy[person].items.push({
            item: expense.item,
            amount: amountPerPerson,
          });
        }
      });
    });

    return result;
  }, [expenses, group?.users]);

  // Calculate what current user owes to others
  const userOwes = useMemo(() => {
    const debts: Array<{
      to: string;
      amount: number;
      items: Array<{
        item: string;
        amount: number;
      }>;
    }> = [];

    Object.entries(expensesByPayer).forEach(([payer, data]) => {
      if (
        payer !== currentUser &&
        data.owedBy[currentUser] &&
        data.owedBy[currentUser].total > 0
      ) {
        debts.push({
          to: payer,
          amount: data.owedBy[currentUser].total,
          items: data.owedBy[currentUser].items,
        });
      }
    });

    return debts;
  }, [expensesByPayer, currentUser]);

  // Calculate total amount user owes
  const totalUserOwes = useMemo(
    () => userOwes.reduce((sum, debt) => sum + debt.amount, 0),
    [userOwes]
  );

  // Add this function to calculate width based on content
  const getInputWidth = (text: string, isAmount: boolean) => {
    // Base width plus some padding
    const baseWidth = isAmount ? 20 : 40;
    // Approximate width per character (in pixels)
    const charWidth = 8;
    // Calculate width based on text length
    const contentWidth = Math.max(text.length * charWidth, baseWidth);
    // Return the width as a string with 'px'
    return `${contentWidth}px`;
  };

  return (
    <div className="space-y-8">
      {/* You owe section - Updated with single Venmo icon and clickable bubbles */}
      {userOwes.length > 0 && (
        <div className="bg-[#E7FCFB] rounded-xl p-4 shadow-sm w-fit">
          <div className="flex items-center mb-3">
            <h3 className="text-lg text-black font-bold">You owe</h3>
            <span className="ml-2 text-lg font-bold text-[#57E3DC]">
              ${totalUserOwes.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {userOwes.map((debt, index) => (
              <div
                key={`you-owe-${index}`}
                className="flex flex-row items-center bg-white rounded-full p-1 pr-3 shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleVenmoPayment(debt.to, debt.amount)}
              >
                <ProfileAvatar
                  username={debt.to}
                  imageUrl={
                    group?.users.find((u) => u.username === debt.to)
                      ?.profilePicture
                  }
                  size="sm"
                />
                <div className="ml-2 mr-3">
                  <div className="font-medium text-sm text-black">
                    {debt.to}
                  </div>
                  <div className="font-bold text-[#57E3DC]">
                    ${debt.amount.toFixed(2)}
                  </div>
                </div>
                {/* Single Venmo icon */}
                <div className="w-8 h-8 flex items-center justify-center bg-[#3D95CE] text-white rounded-full">
                  <VenmoIcon size={16} color="white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections for each payer */}
      <div className="flex flex-row flex-wrap gap-4">
        {Object.entries(expensesByPayer).map(([payer, data]) => {
          // Skip if this person hasn't paid for anything
          if (data.totalPaid === 0) return null;

          // Get all people who owe this payer
          const debtors = Object.entries(data.owedBy).filter(
            ([_, debtData]) => debtData.total > 0
          );

          // Skip if nobody owes this person
          if (debtors.length === 0) return null;

          return (
            <div
              key={`payer-${payer}`}
              className="bg-white rounded-xl p-6 shadow-md w-fit h-fit"
            >
              <div className="flex items-center gap-3 mb-4">
                <ProfileAvatar
                  username={payer}
                  imageUrl={
                    group?.users.find((u) => u.username === payer)
                      ?.profilePicture
                  }
                  size="md"
                />
                <div>
                  <h3 className="text-lg font-bold text-black">{payer}</h3>
                  <span className="text-gray-500">
                    ${data.totalPaid.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {debtors.map(([debtor, debtData]) => (
                  <div
                    key={`${payer}-${debtor}`}
                    className="border-t pt-4 w-fit"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar
                          username={debtor}
                          imageUrl={
                            group?.users.find((u) => u.username === debtor)
                              ?.profilePicture
                          }
                          size="sm"
                        />
                        <span className="font-medium text-black">{debtor}</span>
                      </div>
                      <span className="font-bold text-black">
                        ${debtData.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2 pl-10">
                      {debtData.items.map((item, idx) => (
                        <div
                          key={`${payer}-${debtor}-${idx}`}
                          className="flex items-center gap-2 group relative hover:bg-gray-50 p-1 rounded w-fit"
                        >
                          <span className="w-2 h-2 bg-[#57E3DC] rounded-full"></span>

                          {editing &&
                          editing.payerId === payer &&
                          editing.debtorId === debtor &&
                          editing.itemIndex === idx &&
                          editing.field === "name" ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={handleKeyPress}
                              style={{ width: getInputWidth(editValue, false) }}
                              className="text-gray-600 border-b border-gray-300 focus:outline-none focus:border-dark1 min-w-[60px]"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-gray-600 cursor-pointer hover:text-black"
                              onClick={() =>
                                startEditing(
                                  payer,
                                  debtor,
                                  idx,
                                  "name",
                                  item.item
                                )
                              }
                            >
                              {item.item}
                            </span>
                          )}

                          {editing &&
                          editing.payerId === payer &&
                          editing.debtorId === debtor &&
                          editing.itemIndex === idx &&
                          editing.field === "amount" ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={handleKeyPress}
                              style={{ width: getInputWidth(editValue, true) }}
                              className="text-gray-600 border-b border-gray-300 focus:outline-none focus:border-dark1 ml-auto min-w-[40px] text-right"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-gray-600 ml-auto cursor-pointer hover:text-black"
                              onClick={() =>
                                startEditing(
                                  payer,
                                  debtor,
                                  idx,
                                  "amount",
                                  item.amount.toFixed(2)
                                )
                              }
                            >
                              ${item.amount.toFixed(2)}
                            </span>
                          )}

                          {/* Delete button */}
                          <button
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2"
                            onClick={() =>
                              handleDeleteExpense(payer, debtor, idx)
                            }
                            title="Delete expense"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M18 6L6 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6 6L18 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseBreakdown;
