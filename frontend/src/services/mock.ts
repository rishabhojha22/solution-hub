import { Notification, SolutionRequest } from "@/types";
export const requests:SolutionRequest[]=[
 {id:"sap-testing",title:"Looking for automated SAP testing",department:"Engineering",team:"Business Systems",description:"Need a reusable approach to test SAP flows before releases.",interested:12,status:"Open"},
 {id:"energy",title:"Energy consumption anomaly detection",department:"Manufacturing",team:"Factory Operations",description:"Seeking a solution to identify unexpected energy usage patterns.",interested:8,status:"Open"},
 {id:"docs",title:"Generate technical documentation from code",department:"IT",team:"Developer Productivity",description:"Looking for a controlled way to turn code changes into useful documentation.",interested:19,status:"Open"}
];
export const notifications:Notification[]=[
 {id:"1",title:"Access request approved",body:"Computer Vision Team approved your request for Visual Quality Inspection.",time:"20 min ago",unread:true,kind:"success"},{id:"2",title:"A solution was reused",body:"Test Orchestrator was reused by Digital Factory.",time:"2 hours ago",unread:true,kind:"info"},{id:"3",title:"Review needed",body:"Your updated documentation is ready for review.",time:"Yesterday",unread:false,kind:"warning"}
];
