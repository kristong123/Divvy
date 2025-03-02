import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import ProfileAvatar from "../../shared/ProfileAvatar";
import { toast } from "react-hot-toast";
import VenmoIcon from "../../shared/VenmoIcon";
import { removeExpense } from "../../../services/socketService";
import { X } from "lucide-react";

interface ExpenseBreakdownProps {
  groupId: string;
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ groupId }) => {
  const currentUser = useSelector((state: RootState) => state.user.username);
  const group = useSelector((state: RootState) => state.groups.groups[groupId]);
  const expenses = group?.currentEvent?.expenses || [];
  
  // State for editing expense amounts
  const [editingState, setEditingState] = useState<{
    payerId: string;
    debtorId: string;
    itemIndex: number;
    field: "name" | "amount";
    value: string;
  } | null>(null);

  // Calculate what each user owes and is owed
  const expenseSummary = useMemo(() => {
    // Structure to hold what each user owes and is owed
    const summary: Record<string, {
      paid: number;  // Total amount this user paid for others
      owed: number;  // Total amount this user owes to others
      owesTo: Record<string, number>;  // What this user owes to each other user
      isOwedBy: Record<string, {  // What each user owes to this user
        total: number;
        items: Array<{
          id: string;
          item: string;
          amount: number;
          index: number;
        }>;
      }>;
    }> = {};
    
    // Initialize the summary for each user
    group?.users.forEach(user => {
      summary[user.username] = {
        paid: 0,
        owed: 0,
        owesTo: {},
        isOwedBy: {}
      };
      
      // Initialize owesTo and isOwedBy for each other user
      group.users.forEach(otherUser => {
        if (user.username !== otherUser.username) {
          summary[user.username].owesTo[otherUser.username] = 0;
          summary[user.username].isOwedBy[otherUser.username] = {
            total: 0,
            items: []
          };
        }
      });
    });
    
    // Process each expense
    expenses.forEach((expense, index) => {
      const payer = expense.paidBy;
      const debtor = expense.addedBy;
      
      // Skip if payer or debtor doesn't exist in summary
      if (!summary[payer] || !summary[debtor]) return;
      
      // If payer and debtor are different, update the summary
      if (payer !== debtor) {
        // Update what payer paid for others
        summary[payer].paid += expense.amount;
        
        // Update what debtor owes to payer
        summary[debtor].owed += expense.amount;
        summary[debtor].owesTo[payer] = (summary[debtor].owesTo[payer] || 0) + expense.amount;
        
        // Update what payer is owed by debtor
        if (!summary[payer].isOwedBy[debtor]) {
          summary[payer].isOwedBy[debtor] = { total: 0, items: [] };
        }
        summary[payer].isOwedBy[debtor].total += expense.amount;
        summary[payer].isOwedBy[debtor].items.push({
          id: expense.id,
          item: expense.item,
          amount: expense.amount,
          index
        });
      }
    });
    
    return summary;
  }, [expenses, group?.users]);
  
  // Calculate what current user owes to others
  const userOwes = useMemo(() => {
    if (!expenseSummary[currentUser]) return [];
    
    return Object.entries(expenseSummary[currentUser].owesTo)
      .filter(([_, amount]) => amount > 0)
      .map(([username, amount]) => ({
        to: username,
        amount
      }));
  }, [expenseSummary, currentUser]);
  
  // Calculate total amount user owes
  const totalUserOwes = useMemo(() => 
    userOwes.reduce((sum, debt) => sum + debt.amount, 0),
    [userOwes]
  );
  
  // Function to start editing an expense
  const startEditing = (payer: string, debtor: string, itemIndex: number, field: "name" | "amount", value: string) => {
    setEditingState({ 
      payerId: payer, 
      debtorId: debtor, 
      itemIndex, 
      field,
      value
    });
  };
  
  // Function to handle removing an expense item
  const handleRemoveItem = (
    itemData: { 
      id: string; 
      item: string; 
      amount: number; 
      index: number 
    }
  ) => {
    const expenseToDelete = expenses[itemData.index];
    
    if (!expenseToDelete) {
      toast.error("Couldn't find the expense to delete");
      return;
    }
    
    removeExpense(groupId, expenseToDelete, itemData.index);
    toast.success("Item removed");
  };
  
  return (
    <div className="space-y-8">
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
                <ProfileAvatar
                  username={debt.to}
                  size={32}
                />
                <span className="ml-2 text-sm">{debt.to}</span>
                <span className="ml-auto text-sm font-medium">
                  ${debt.amount.toFixed(2)}
                </span>
                
                {/* Venmo button */}
                {group?.users.find((u) => u.username === debt.to)?.venmoUsername && (
                  <a
                    href={`https://venmo.com/${
                      group?.users.find((u) => u.username === debt.to)?.venmoUsername
                    }?txn=pay&amount=${debt.amount.toFixed(2)}&note=Payment for ${
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
          .filter(([_, data]) => Object.values(data.isOwedBy).some(debt => debt.total > 0))
          .map(([payer, data]) => (
            <div key={payer} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center mb-3">
                <ProfileAvatar
                  username={payer}
                  size={32}
                />
                <span className="ml-2 font-medium">{payer}</span>
                <span className="ml-auto text-sm text-gray-500">
                  paid ${data.paid.toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-4">
                {Object.entries(data.isOwedBy)
                  .filter(([_, debtData]) => debtData.total > 0)
                  .map(([debtor, debtData]) => (
                    <div key={debtor} className="pl-4 border-l-2 border-gray-100">
                      <div className="flex items-center mb-2">
                        <ProfileAvatar
                          username={debtor}
                          size={32}
                        />
                        <span className="ml-2 text-sm">{debtor}</span>
                        <span className="ml-auto text-sm font-medium">
                          owes ${debtData.total.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {debtData.items.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex items-center text-sm pl-6 py-1 group hover:bg-gray-50 rounded"
                          >
                            {/* Item name */}
                            <span className="text-gray-600">{item.item}</span>
                            
                            {/* Amount */}
                            {editingState &&
                            editingState.payerId === payer &&
                            editingState.debtorId === debtor &&
                            editingState.itemIndex === idx ? (
                              <input
                                type="text"
                                value={editingState.value || item.amount.toFixed(2)}
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
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ExpenseBreakdown;
