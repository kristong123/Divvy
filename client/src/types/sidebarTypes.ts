export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    timestamp: string;
    read: boolean;
}