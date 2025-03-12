# User Documentation

## Description

A social and financial app that streamlines expense sharing and group communication. Divvy combines financial management with social features to eliminate the complexity of tracking shared expenses and coordinating group activities. It works just like any other social app where you create an account and friend people to DM each other or create group chats. Then within these chat rooms, you can easily set expenses that automatically evenly divides the cost each person needs to pay to your Venmo account. 

## Getting Started

Currently only desktop web browsers can fully access Divvy and mobile support hasn’t fully been implemented yet. So please only access Divvy through a desktop/laptop browser or you might not be able to fully use Divvy.
1. To start using Divvy, go to our website https://divvy-chi.vercel.app/login and create an account. To create an account, just put in your desired username and password in the boxes and click sign up. 
2. Once you sign up, login with your username and password
3. Now in the home screen, in the top left corner, link your Venmo account below your username and optionally update your profile picture by clicking on the icon next to your username. Now you're all set to start using Divvy!

## Using Divvy

Now that you have created an account and linked your Venmo account, you can start adding, messaging, and track shared expenses with other users. Below are guides on using all our main features which we recommended to look at these guides if this is your first time using Divvy. 

### Friend System
You need friends to start using Divvy! Once your friends have made accounts and set up their profile, it is time to start adding your friends and managing your friend list. The Friend system is still a work in progress and some functions aren’t working/implemented yet. Currently you can add other users but can’t remove or block users. For current bugs, please refer to the Known Bugs section before reporting any bugs.

#### Adding Friends

1. To add your friends, underneath your profile you will see three icons. **Click on the icon with a plus sign to access the friend menu**. This menu will allow you to add friends, see incoming friend requests, and see pending friend requests.
2. Once you click on the icon, **if you are trying to add your friend**, type in your friend’s username in the “Add Friend” textbox. Once you typed in your friend’s username, press enter and the friend request will be sent. You will see a notification upon a successful friend request and see the username you are requesting to be friends with under “Sent Request”.
   - **If you are awaiting a friend request**, you can check your notifications alert by clicking on the bell icon or you will see usernames of people who sent you a friend request under “Friend Request”. You can accept their friend request by clicking on the green check mark or reject them by clicking on the red X mark.
3. Once your friend request gets accepted or you accept a friend request, you can now see your friend in your friend list when you click on the icon with two people.

### Messaging and Group Chats

It’s time to start messaging your friends whether individually or in a group. In order to directly message another user and invite users into group chats, **you will need to be friends with them first**. If you don’t know how to add other users, refer to the Friend System guide. Our messaging functionality is still a work in progress and some functions aren’t working/implemented yet. Currently a user can’t leave or delete group chats they were in, can’t change group chat’s profile picture, and can’t upload images/videos as messages. For current bugs, please refer to the Known Bugs section before reporting any bugs.

#### Direct Messaging
1. To start messaging your friends, **click on the double person icon to access your friend list**.
2. Once you are in the friend list menu, **click on any of your friends and it will open up the chat room with them**.
3. Now just type anything you want in the textbox and press enter to send your message to your friend.

#### Group Chats

1. If you want **to create group chats, ensure you are in the home screen**. If you are unsure if you are on the home screen, press the home icon on the bottom left corner and it will take you to the home page. On the home screen, you will see a box with a plus sign in the middle of it. **Click on the box with the plus sign to create a new group chat**.
   - If you **are awaiting a group chat invite**, you can check your notifications alert by clicking on the bell icon or by clicking on the user that sent you the invite in the friends list(double person icon). In either case you will join the group chat once you accept the invitation by clicking on the  “Join Group” option. 
   - Once you join the group, it will take you to the group chat and you can begin messaging in the group chat.
2. Once you click on the box with the plus sign, name your group chat to whatever you desire and press OK. Now you should see a new group chat in your home screen and clicking on it will take you to your group chat.
3. Once you are in the group chat, you can see all the members that are in it on the right hand of the screen and who is the admin of the group chat. **To invite users to the group chat**, on the **top right corner of the group chat, click on the person with a plus sign**. From there enter the user you want to invite to the group chat in the textbox and press enter. When completed, you will get a notification that the user has received the group chat invite 
4. Once your group chat invite gets accepted, you should see them in the members lists on the right hand of the screen. Enjoy chatting with all your friends now.

### Event Expenses

Now that you are in a group chat, it’s time to utilize our main feature, the Event Expenses. The Event Expenses is used to help keep track of event cost and to evenly distribute the cost between all members in the group chat. If you don’t know how to create group chats, refer to the Group Chats guide.Our Event Expenses functionality is still a work in progress and some functions aren’t working/implemented yet. Currently a user can’t directly split the cost of an expense and delete/edit existing expense. For current bugs, please refer to the Known Bugs section before reporting any bugs.

1. **To create the Event Expense in the group chat**, look at the top right corner of the group chat and **click on the calendar icon**.
2. Once you click on the calendar icon, you will get a pop up regarding the details of the event you are trying to create. Enter the desired event name, date of the event and optionally a description of the event. Once you filled out the details of the event, press “Create Event”
3. Once you created the event, **in place of the calendar icon, is the event you just created**. Click on the event you created to get information about the event.
4. Once you click on the event you created, you will initially see the total cost of the event being $0.00 and two buttons being “Add Expense” and “Cancel Event”. **To create expenses for the event, click on the “Add Expense”**. You will get a pop up where you will enter the desired expense name, the total amount of the expense, and which members you are splitting the expense with. Splitting the expense is automatically divided equally for all members.
5. Once you have filled out the details regarding the expense, press “Add Expense” on the pop up. It will take you back to the created event page and you will now see an updated total cost of the event with the amount you put in, the members you split the expense, and how much they need to pay you back.
   - **If you are a member that is splitting the cost of an expense that another member created**, you will instead see how much money you owe the creator and a Venmo icon to pay them back.
   - When you click on the Venmo Icon, it will redirect you to a Venmo payment of the associated amount of money that you owe. Once you finish the Venmo payment, it will redirect you back to Divvy and a popup will appear asking you that you did confirm the Venmo payment to the person.When a member pays back the amount they owe back to others, the Event page will update. If you were awaiting and received payment from a member, it will remove that member name on the list that owed you money. Whereas if you owed someone money and you paid it back, it will no longer say you owed that person money. The total cost of the event will also decrease as everyone is paying their share of the event.
6. Once the event is no longer relevant, you can click back to the created event and press “Cancel Event” to remove the event. This will delete all information regarding the event from expenses and how much each member needs to pay back to another member.

## Reporting Bugs

If you find bugs please contact us at divvybusiness1@gmail.com! When reporting bugs, here is what we require you to do. 
1. In the header, please format it as BUG: [Bug you are reporting]. Be specific about the bug you are reporting from where the bug is found and what it is. Make to sure refer to the Known Bugs before reporting a bug
2. In the body, describe how you encountered the bug and describe the bug.
   - First describe how you encountered the bug and the steps you did cause the bug. Be specific on the steps and tell us how easily reproducible the bug is. 
   - Then describe the output of the bug and what the expected result should have been. 
   - Please provide your Divvy username in the body of the email and NOT your password.
   - Then be sure to add the dates, times, and web browser you are using when the bug occurred. Optionally you can attach a picture for better clarity.

## Known Bugs

General

- Notifications of a task completion(I.E friend request, group invite, updating profile picture) sometimes doesn’t appear.

        
Friend System

- When accepting a friend request, doesn’t update the friends list, requiring you to refresh the page

Messaging and Group Chats
- Sending images requires user to upload their image 2 or more times for it to send
- Sending images in group chats is not properly being displayed. Users who sent images will see it but others will only see the image name. In addition upon re-entering the group chat, the image will display it's image name.
- Leaving a group chat sometimes causes the chat room to not accurately display new messages being sent. So users will need to refresh their page to have real-time chat functionality to work again.
- Group invites only works when the both user and sendee are logged in to accept/decline the invite

Event Expenses
- N/A

