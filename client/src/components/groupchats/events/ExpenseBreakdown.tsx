import React, { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import ProfileAvatar from "../../shared/ProfileAvatar";
import { toast } from "react-hot-toast";
import VenmoIcon from "../../shared/VenmoIcon";
import {
  removeExpense,
  updateExistingExpenses,
} from "../../../services/socketService";
import { X } from "lucide-react";
import { store } from "../../../store/store";
import { groupActions } from "../../../store/slice/groupSlice";

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
              item: string;
              amount: number;
              index: number;
            }>;
          }
        >;
      }
    >
  >({});

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

    // Check if any expenses are missing splitBetween
    const needsUpdate = localExpenses.some(
      (exp) => !exp.splitBetween || exp.splitBetween.length === 0
    );

    if (needsUpdate) {
      // Update expenses with missing splitBetween
      localExpenses = localExpenses.map((exp) => {
        if (!exp.splitBetween || exp.splitBetween.length === 0) {
          return {
            ...exp,
            splitBetween: groupMembers.map((m) => m.username),
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
              item: string;
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
      const payer = expense.paidBy;

      // Make sure splitBetween exists and is not empty
      if (!expense.splitBetween || expense.splitBetween.length === 0) {
        return;
      }

      // Calculate amount per person
      const amountPerPerson = expense.amount / expense.splitBetween.length;

      // For each person in splitBetween, create a debt relationship
      expense.splitBetween.forEach((debtor) => {
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
          item: expense.item,
          amount: amountPerPerson,
          index: index,
        });
      });
    });

    // Set the calculated summary
    setExpenseSummary(summary);
  }, [reduxExpenses, groupMembers, groupId, dispatch, group?.currentEvent]);

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
    setEditingState({
      payerId: payer,
      debtorId: debtor,
      itemIndex,
      field,
      value,
    });
  };

  // Function to handle removing an expense item
  const handleRemoveItem = (itemData: {
    id: string;
    item: string;
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

  // Check if any expenses are missing splitBetween
  useEffect(() => {
    // Check if any expenses are missing splitBetween
    const hasMissingSplitBetween = reduxExpenses.some(
      (expense) => !expense.splitBetween
    );

    if (hasMissingSplitBetween) {
      updateExistingExpenses(groupId);
    }
  }, [reduxExpenses, groupId]);

  // Update local state when expenses change in Redux
  useEffect(() => {
    setLocalExpenses(reduxExpenses);
  }, [reduxExpenses]);

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

              <div className="space-y-2">
                {userOwes.map((debt) => (
                  <div key={debt.to} className="flex items-center">
                    <ProfileAvatar username={debt.to} size={32} />
                    <span className="ml-2 text-sm">{debt.to}</span>
                    <span className="ml-auto text-sm font-medium">
                      ${(debt.amount as number).toFixed(2)}
                    </span>

                    {/* Venmo button */}
                    {groupMembers.find((u) => u.username === debt.to)
                      ?.venmoUsername && (
                      <a
                        href={`https://venmo.com/${
                          groupMembers.find((u) => u.username === debt.to)
                            ?.venmoUsername
                        }?txn=pay&amount=${(debt.amount as number).toFixed(
                          2
                        )}&note=Payment for ${
                          group?.currentEvent?.title || "expenses"
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#3D95CE] hover:text-[#2D7AAF]"
                      >
                        <VenmoIcon size={20} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense breakdown by person */}
          <div className="space-y-6">
            {Object.entries(expenseSummary)
              .filter(([_, data]) =>
                Object.values((data as any).isOwedBy).some(
                  (debt: any) => debt.total > 0
                )
              )
              .map(([payer, data]) => (
                <div
                  key={payer}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center mb-3">
                    <ProfileAvatar username={payer} size={32} />
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
                            <ProfileAvatar username={debtor} size={24} />
                            <span className="text-gray-700 ml-2 text-sm">
                              {debtor}
                            </span>
                            <span className="ml-auto text-sm font-medium">
                              owes ${(debtData as any).total.toFixed(2)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {(debtData as any).items.map(
                              (item: any, idx: number) => (
                                <div
                                  key={`${item.id}-${idx}`}
                                  className="flex items-center text-sm pl-6 py-1 group hover:bg-gray-50 rounded"
                                >
                                  {/* Item name */}
                                  <span className="text-gray-600 mr-3">
                                    {item.item}
                                  </span>

                                  {/* Amount */}
                                  {editingState &&
                                  editingState.payerId === payer &&
                                  editingState.debtorId === debtor &&
                                  editingState.itemIndex === idx ? (
                                    <input
                                      type="text"
                                      value={
                                        editingState.value ||
                                        item.amount.toFixed(2)
                                      }
                                      onChange={(e) =>
                                        setEditingState({
                                          ...editingState,
                                          value: e.target.value,
                                        })
                                      }
                                      onBlur={() => setEditingState(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setEditingState(null);
                                        }
                                      }}
                                      className="ml-auto w-20 text-right border-b border-gray-300 focus:outline-none focus:border-blue-500"
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
