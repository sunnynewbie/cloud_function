var functions = require("firebase-functions");
const firebase = require('firebase-admin');
const moment = require("moment/moment");

const app = firebase.initializeApp()
const firestore = app.firestore()

const userRef = firestore.collection('users');
const proofRef = firestore.collectionGroup('proof')
const taskRef = firestore.collectionGroup('tasks')
const chatRef = firestore.collection('chats')
const reminderRef = firestore.collection('reminderRef')


exports.remdiernotification = functions.pubsub.schedule("every 30 minutes").onRun(async (ctx) => {
    try {
        var querySnap = await reminderRef.where("reminded", "==", false).get();
        if (querySnap.docs.length > 0) {
            var reminderList = querySnap.docs.map(e.data())
            for (var i = 0; i < reminderList.length; i++) {
                var remider = reminderList[i]
                var userId = remider.userId;
                var date = remider.reminderTime.toDate();
                var currentDate = new Date();
                var timeDiffrence = moment(currentDate).diff(date)
                var diffrenceInMinute = timeDiffrence / 60000;
                if (diffrenceInMinute <= 30) {
                    userRef.doc(userId).get().then(async value => {
                        var token = value.data().token
                        await app.messaging().sendToDevice(token, {
                            data: {
                                title: "Reminder",
                                body: `Reminder for complete ${remider.habit} after ${diffrenceInMinute} minutes`
                            }
                        })
                        await reminderRef.doc(remider.id).set({ 'remided': true }, { merge: true });
                    })
                }

            }
        }
    } catch (error) {
        console.log(error);
    }
})


exports.sendChatNotification = functions.firestore.document("chat/{chatId}").onUpdate(async (snapshot, contxt) => {
    try {
        var chatData = snapshot.after.data();
        if (chatData.lastMessage != null) {
            try {
                var senderId = chatData.lastMessage.senderId;
                var userIds = chatData.userIds;
                var otherUser = ""
                for (var i = 0; i < userIds.length; i++) {
                    if (senderId !== userIds[i]) {
                        otherUser = userIds[i]
                    }
                }
                var userDoc = await userRef.doc((otherUser).toString()).get();
                var otheruserData = userDoc.data();
                let token = userDoc.data().token
                await app.messaging().sendToDevice(token, {
                    data: {
                        title: otheruserData.name,
                        body: chatData.lastMessage.message,
                        click_action: FLUTTER_CLICK,
                    }
                })

            } catch (error) {
                console.log(error)
            }
        }

    } catch (error) {
        console.log(error);
    }
})

exports.reportgenerator = functions.firestore.document("users/{userIds}/task/{taskid}/proofs").onCreate(async (snapshot, ctx) => {
    try {
        var proofData = snapshot.data()
        var taskId = proofData.taskId;
        var userId = proofData.userId;
        var reportData = {}
        var tasksnapshot = await userRef.doc(userId).collection('tasks').doc(taskId).get();

        if (tasksnapshot.data() != null) {
            let taskData = tasksnapshot.data()
            reportData.taskId = taskId;
            reportData.userId = userId;
            reportData.frequency = taskData.frequency;
            reportData.completionTime = parseInt(taskData.timeofCompletion);
            reportData.time = taskData.time.toDate();
            var sunbmitedDate = proofData.createdAt.toDate();
            var differnce = moment(reportData.time).diff(sunbmitedDate)
            var diffrenceInMinute = differnce / 60000

        }

    } catch (error) {
        console.log(error)
    }
})

