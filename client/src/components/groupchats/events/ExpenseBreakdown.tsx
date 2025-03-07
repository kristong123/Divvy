import React, { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import ProfileFrame from "../../shared/ProfileFrame";
import { toast } from "react-hot-toast";
import VenmoIcon from "../../shared/VenmoIcon";
import ClickInput from "../../shared/ClickInput";
import { removeExpense, updateExpense } from "../../../services/socketService";
import { X } from "lucide-react";
import { store } from "../../../store/store";
import { groupActions } from "../../../store/slice/groupSlice";
import axios from "axios";
import { BASE_URL } from "../../../config/api";

interface ExpenseBreakdownProps {
  groupId: string;
}

// Define a type for the debt object
interface Debt {
  to: string;
  amount: number;
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ groupId }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);
  const reduxExpenses = group?.currentEvent?.expenses || [];
  const groupMembers = group?.users || [];
  const dispatch = useDispatch();

  // State for editing expense amounts
  const [editingState, setEditingState] = useState<{
    payerId: string;
    debtorId: string;
    itemIndex: number;
    field: "name" | "amount";
    value: string;
  } | null>(null);

  // State for tracking expenses locally
  const [localExpenses, setLocalExpenses] = useState(reduxExpenses);

  // State for expense summary
  const [expenseSummary, setExpenseSummary] = useState<
    Record<
      string,
      {
        paid: number;
        owed: number;
        owesTo: Record<string, number>;
        isOwedBy: Record<
          string,
          {
            total: number;
            items: Array<{
              id: string;
              itemName: string;
              amount: number;
              index: number;
            }>;
          }
        >;
      }
    >
  >({});

  // Update local state when redux expenses change
  useEffect(() => {
    setLocalExpenses(reduxExpenses);
  }, [reduxExpenses]);

  // Calculate what the current user owes to others
  const userOwes = useMemo<Debt[]>(() => {
    if (!currentUser || !expenseSummary[currentUser]) return [];

    return Object.entries(expenseSummary[currentUser].owesTo)
      .filter(([_, amount]) => (amount as number) > 0)
      .map(([username, amount]) => ({
        to: username,
        amount: amount as number,
      }));
  }, [currentUser, expenseSummary]);

  // Ensure component refreshes when group data changes, including Venmo usernames
  useEffect(() => {
    // This dependency array includes group and groupMembers
    // When a user's Venmo username is updated, the groupMembers array will change
    // causing this component to re-render with the updated Venmo username
    console.log("Group or group members updated, refreshing component");
  }, [group, groupMembers]);

  // Function to get the latest Venmo username for a user
  const getLatestVenmoUsername = (username: string): string | undefined => {
    // First check in the current group members
    const groupMember = groupMembers.find((u) => u.username === username);
    if (groupMember?.venmoUsername) {
      return groupMember.venmoUsername;
    }

    // If not found or null, try to find in other groups
    const allGroups = store.getState().groups.groups;
    for (const groupId in allGroups) {
      const group = allGroups[groupId];
      const user = group.users.find((u) => u.username === username);
      if (user?.venmoUsername) {
        return user.venmoUsername;
      }
    }

    return undefined;
  };

  // Function to fetch the latest user data directly from the API
  const fetchLatestUserData = async (
    username: string
  ): Promise<string | undefined> => {
    try {
      const response = await axios.get(`${BASE_URL}/api/users/${username}`);
      if (response.data && response.data.venmoUsername) {
        console.log(
          `Fetched latest Venmo username for ${username}: ${response.data.venmoUsername}`
        );
        return response.data.venmoUsername;
      }
      return undefined;
    } catch (error) {
      console.error(`Error fetching user data for ${username}:`, error);
      return undefined;
    }
  };

  // Calculate expense summary
  useEffect(() => {
    if (!reduxExpenses || reduxExpenses.length === 0) {
      setExpenseSummary({});
      return;
    }

    // Add a single meaningful log for expense calculation
    console.log(
      `💰 Calculating expenses for ${reduxExpenses.length} items in group: ${groupId}`
    );

    // Create a local copy of expenses to work with
    let localExpenses = [...reduxExpenses];

    // Check if any expenses are missing metadata
    const needsUpdate = reduxExpenses.some(
      (exp) => !(exp as any)._debtor && !(exp as any)._splitBetween
    );

    if (needsUpdate) {
      // Update expenses with missing metadata
      localExpenses = localExpenses.map((exp) => {
        if (!(exp as any)._debtor && !(exp as any)._splitBetween) {
          // For backward compatibility, assume the expense is for all group members
          return {
            ...exp,
            _debtor: groupMembers.find((m) => m.username !== exp.addedBy)
              ?.username,
          };
        }
        return exp;
      });

      // Update Redux store with the fixed expenses
      dispatch(
        groupActions.setGroupEvent({
          groupId,
          event: {
            ...group?.currentEvent,
            id: group?.currentEvent?.id || `event-${Date.now()}`,
            title: group?.currentEvent?.title || "Untitled Event",
            date: group?.currentEvent?.date || new Date().toISOString(),
            description: group?.currentEvent?.description || "",
            expenses: localExpenses,
          },
        })
      );
    }

    // Initialize summary object with all group members
    const summary: Record<
      string,
      {
        paid: number;
        owed: number;
        owesTo: Record<string, number>;
        isOwedBy: Record<
          string,
          {
            total: number;
            items: Array<{
              id: string;
              itemName: string;
              amount: number;
              index: number;
            }>;
          }
        >;
      }
    > = {};
    groupMembers.forEach((member) => {
      summary[member.username] = {
        paid: 0,
        owed: 0,
        owesTo: {},
        isOwedBy: {},
      };
    });

    // Process each expense - use localExpenses here
    localExpenses.forEach((expense, index) => {
      // Use addedBy to track who paid
      const payer = expense.addedBy;

      // If this expense has a debtor, process it directly
      if ((expense as any)._debtor) {
        const debtor = (expense as any)._debtor;

        // Skip if payer or debtor doesn't exist in summary
        if (!summary[payer] || !summary[debtor]) {
          return;
        }

        // Skip if payer and debtor are the same person
        if (payer === debtor) {
          return;
        }

        // Update what payer paid for others
        summary[payer].paid += expense.amount;

        // Update what debtor owes to payer
        summary[debtor].owed += expense.amount;
        summary[debtor].owesTo[payer] =
          (summary[debtor].owesTo[payer] || 0) + expense.amount;

        // Update what payer is owed by debtor
        if (!summary[payer].isOwedBy[debtor]) {
          summary[payer].isOwedBy[debtor] = { total: 0, items: [] };
        }
        summary[payer].isOwedBy[debtor].total += expense.amount;
        summary[payer].isOwedBy[debtor].items.push({
          id: expense.id,
          itemName: expense.itemName,
          amount: expense.amount,
          index: index,
        });
        return;
      }

      // For backward compatibility, handle expenses with _splitBetween
      if (
        (expense as any)._splitBetween &&
        (expense as any)._splitBetween.length > 0
      ) {
        // Calculate amount per person
        const amountPerPerson =
          expense.amount / (expense as any)._splitBetween.length;

        // For each person in _splitBetween, create a debt relationship
        (expense as any)._splitBetween.forEach((debtor: string) => {
          // Skip if payer or debtor doesn't exist in summary
          if (!summary[payer] || !summary[debtor]) {
            return;
          }

          // Skip if payer and debtor are the same person
          if (payer === debtor) {
            return;
          }

          // Update what payer paid for others
          summary[payer].paid += amountPerPerson;

          // Update what debtor owes to payer
          summary[debtor].owed += amountPerPerson;
          summary[debtor].owesTo[payer] =
            (summary[debtor].owesTo[payer] || 0) + amountPerPerson;

          // Update what payer is owed by debtor
          if (!summary[payer].isOwedBy[debtor]) {
            summary[payer].isOwedBy[debtor] = { total: 0, items: [] };
          }
          summary[payer].isOwedBy[debtor].total += amountPerPerson;
          summary[payer].isOwedBy[debtor].items.push({
            id: expense.id,
            itemName: expense.itemName,
            amount: amountPerPerson,
            index: index,
          });
        });
      }
    });

    // Set the calculated summary
    setExpenseSummary(summary);
  }, [reduxExpenses, groupMembers, groupId, dispatch, group?.currentEvent]);

  // Calculate total amount user owes
  const totalUserOwes = useMemo(
    () =>
      (userOwes as { to: string; amount: number }[]).reduce(
        (sum, debt) => sum + debt.amount,
        0
      ),
    [userOwes]
  );

  // Function to start editing an expense
  const startEditing = (
    payer: string,
    debtor: string,
    itemIndex: number,
    field: "name" | "amount",
    value: string
  ) => {
    // Initialize with the current value
    setEditingState({
      payerId: payer,
      debtorId: debtor,
      itemIndex,
      field,
      value,
    });
  };

  // Function to save edited expense
  const saveEditedExpense = () => {
    if (!editingState) return;

    const { payerId, debtorId, itemIndex, field, value } = editingState;

    // Get the expense from the summary
    const expenseItem =
      expenseSummary[payerId]?.isOwedBy[debtorId]?.items[itemIndex];
    if (!expenseItem) {
      toast.error("Couldn't find the expense to update");
      return;
    }

    // Get the original expense from reduxExpenses
    const originalExpense = reduxExpenses[expenseItem.index];
    if (!originalExpense) {
      toast.error("Couldn't find the original expense");
      return;
    }

    // Ensure the expense has an ID
    if (!originalExpense.id) {
      toast.error("Expense is missing an ID");
      return;
    }

    console.log(`Checking expense with ID: ${originalExpense.id}`);

    // Check if the value has actually changed
    if (field === "name") {
      // If the value is empty, don't update
      if (!value.trim()) {
        console.log("Empty item name, skipping update");
        return; // Exit without showing toast or updating
      }

      // Access itemName directly
      const itemName = originalExpense.itemName;

      if (value === itemName) {
        console.log("Item name unchanged, skipping update");
        return; // Exit without showing toast or updating
      }

      // Create updated expense object with new name
      const updatedExpense = {
        ...originalExpense,
        id: originalExpense.id,
        itemName: value,
      };

      // Update the expense
      updateExpense(groupId, {
        ...updatedExpense,
        addedBy: originalExpense.addedBy,
      });

      toast.success(`Item name updated`);
      return;
    }

    if (field === "amount") {
      // If the value is empty, don't update
      if (!value.trim()) {
        console.log("Empty amount, skipping update");
        return; // Exit without showing toast or updating
      }

      const newAmount = parseFloat(value);
      if (isNaN(newAmount)) {
        toast.error("Invalid amount");
        return;
      }

      if (newAmount === originalExpense.amount) {
        console.log("Amount unchanged, skipping update");
        return; // Exit without showing toast or updating
      }

      // Create updated expense object with new amount
      const updatedExpense = {
        ...originalExpense,
        id: originalExpense.id,
        amount: newAmount,
      };

      // Update the expense
      updateExpense(groupId, {
        ...updatedExpense,
        addedBy: originalExpense.addedBy,
      });

      toast.success(`Amount updated`);
      return;
    }
  };

  // Function to handle removing an expense item
  const handleRemoveItem = (itemData: {
    id: string;
    itemName: string;
    amount: number;
    index: number;
  }) => {
    const expenseToDelete = reduxExpenses[itemData.index];

    if (!expenseToDelete) {
      toast.error("Couldn't find the expense to delete");
      return;
    }

    removeExpense(groupId, expenseToDelete, itemData.index);
    toast.success("Item removed");
  };

  // Add this to force a re-render when expenses are updated in the store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const storeExpenses =
        store.getState().groups.groups[groupId]?.currentEvent?.expenses;

      if (
        storeExpenses &&
        JSON.stringify(storeExpenses) !== JSON.stringify(localExpenses)
      ) {
        console.log(
          "Store expenses updated, forcing re-render:",
          storeExpenses
        );
        setLocalExpenses(storeExpenses);
      }
    });

    return () => unsubscribe();
  }, [groupId, localExpenses]);

  const hasExpenses = reduxExpenses.length > 0;

  return (
    <div className="space-y-8">
      {hasExpenses ? (
        <>
          {/* You owe section */}
          {userOwes.length > 0 && (
            <div className="bg-[#E7FCFB] rounded-xl p-4 shadow-sm w-fit">
              <div className="flex items-center mb-3">
                <h3 className="text-lg text-black font-bold">You owe</h3>
                <span className="ml-2 text-lg font-bold text-[#57E3DC]">
                  ${totalUserOwes.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-row flex-wrap gap-3">
                {userOwes.map((debt) => {
                  return (
                    <div
                      key={debt.to}
                      className="bg-white text-black rounded-2xl p-2 shadow-md flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={async () => {
                        // Use our helper function to get the latest Venmo username
                        let freshVenmoUsername = getLatestVenmoUsername(
                          debt.to
                        );

                        if (!freshVenmoUsername) {
                          // If not found in Redux, try fetching directly from the API
                          toast.loading("Checking for Venmo username...");
                          freshVenmoUsername = await fetchLatestUserData(
                            debt.to
                          );
                          toast.dismiss();
                        }

                        if (freshVenmoUsername) {
                          const url = `https://venmo.com/${freshVenmoUsername}?txn=pay&amount=${(
                            debt.amount as number
                          ).toFixed(2)}&note=Payment for ${
                            group?.currentEvent?.title || "expenses"
                          }`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        } else {
                          toast.error(
                            `${debt.to} hasn't set their Venmo username yet`
                          );
                        }
                      }}
                    >
                      <ProfileFrame username={debt.to} size={32} />
                      <div className="flex flex-col items-center mx-2 flex-grow">
                        <span className="text-sm">{debt.to}</span>
                        <span className="ml-auto text-sm font-medium text-dark1">
                          ${(debt.amount as number).toFixed(2)}
                        </span>
                      </div>

                      {/* Venmo indicator - always show */}
                      <div className="ml-2 text-[#3D95CE]">
                        <VenmoIcon size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expense breakdown by person */}
          <div className="flex flex-row flex-wrap gap-4">
            {Object.entries(expenseSummary)
              .filter(([_, data]) =>
                Object.values((data as any).isOwedBy).some(
                  (debt: any) => debt.total > 0
                )
              )
              .map(([payer, data]) => (
                <div
                  key={payer}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 w-fit h-fit"
                >
                  <div className="flex items-center mb-3">
                    <ProfileFrame username={payer} size={32} />
                    <span className="text-black ml-2 font-medium">{payer}</span>
                    <span className="ml-auto text-sm text-gray-500">
                      paid ${(data as any).paid.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Object.entries((data as any).isOwedBy)
                      .filter(([_, debtData]) => (debtData as any).total > 0)
                      .map(([debtor, debtData]) => (
                        <div
                          key={debtor}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                        >
                          <div className="flex items-center mb-2">
                            <ProfileFrame username={debtor} size={24} />
                            <span className="text-gray-700 ml-2 text-sm">
                              {debtor}
                            </span>
                            <span className="ml-auto text-black text-sm font-medium">
                              owes ${(debtData as any).total.toFixed(2)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {(debtData as any).items.map(
                              (item: any, idx: number) => (
                                <div
                                  key={`${item.id}-${idx}`}
                                  className="flex items-center text-sm text-black pl-6 py-1 group hover:bg-gray-50 rounded"
                                >
                                  {/* Bullet point */}
                                  <div className="w-1.5 h-1.5 rounded-full bg-dark1 mr-2 flex-shrink-0"></div>

                                  {/* Item name */}
                                  {editingState &&
                                  editingState.payerId === payer &&
                                  editingState.debtorId === debtor &&
                                  editingState.itemIndex === idx &&
                                  editingState.field === "name" ? (
                                    <ClickInput
                                      value={editingState.value}
                                      onChange={(value) =>
                                        setEditingState({
                                          ...editingState,
                                          value,
                                        })
                                      }
                                      onSave={() => {
                                        saveEditedExpense();
                                        setEditingState(null);
                                      }}
                                      onCancel={() => setEditingState(null)}
                                      minWidth={100}
                                      className="mr-3"
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className="text-gray-600 mr-3 cursor-pointer hover:text-black"
                                      onClick={() =>
                                        startEditing(
                                          payer,
                                          debtor,
                                          idx,
                                          "name",
                                          item.itemName
                                        )
                                      }
                                    >
                                      {item.itemName}
                                    </span>
                                  )}

                                  {/* Amount */}
                                  {editingState &&
                                  editingState.payerId === payer &&
                                  editingState.debtorId === debtor &&
                                  editingState.itemIndex === idx &&
                                  editingState.field === "amount" ? (
                                    <ClickInput
                                      value={editingState.value}
                                      onChange={(value) =>
                                        setEditingState({
                                          ...editingState,
                                          value,
                                        })
                                      }
                                      onSave={() => {
                                        saveEditedExpense();
                                        setEditingState(null);
                                      }}
                                      onCancel={() => setEditingState(null)}
                                      minWidth={60}
                                      className="ml-auto"
                                      textAlign="right"
                                      type="text"
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveItem(item);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 ml-2"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No expenses found. Add an expense to see the breakdown.
        </div>
      )}
    </div>
  );
};

export default ExpenseBreakdown;
