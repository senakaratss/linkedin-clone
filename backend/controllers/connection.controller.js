import ConnectionRequest from "../models/connectionRequest.model.js";
import User from "../models/user.model.js";
import { sendConnectionAcceptedEmail } from "../emails/emailHandlers.js";
import Notification from "../models/notification.model.js";

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (senderId.toString() === userId) {
      return res
        .status(400)
        .json({ message: "You cannot send a connection request to yourself" });
    }
    if (req.user.connections.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already connected with this user" });
    }
    const existingRequest = await ConnectionRequest.findOne({
      sender: senderId,
      recipient: userId,
      status: "pending",
    });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Connection request already sent" });
    }

    const newRequest = new ConnectionRequest({
      sender: senderId,
      recipient: userId,
    });
    await newRequest.save();
    res.status(201).json({ message: "Connection request sent successfully" });
  } catch (error) {
    console.log("Error in sendConnectionRequest controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId)
      .populate("sender", "name email username")
      .populate("recipient", "name username");

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }
    //check if the request is for the current user
    if (request.recipient._id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    request.status = "accepted";
    await request.save();

    //if im your friend then ur also my
    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: { connections: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { connections: request.sender._id },
    });

    const notification = new Notification({
      recipient: request.sender._id,
      relatedUser: userId,
      type: "connectionAccepted",
    });
    await notification.save();
    res.json({ message: "Connection request accepted successfully" });

    //send email
    const senderEmail = request.sender.email;
    const senderName = request.sender.name;
    const recipientName = request.recipient.name;
    const profileUrl =
      process.env.CLIENT_URL + "/profile/" + request.recipient.username;

    try {
      await sendConnectionAcceptedEmail(
        senderEmail,
        senderName,
        recipientName,
        profileUrl
      );
    } catch (error) {
      console.error("Error in sendConnectionAcceptedEmail:", error.message);
    }
  } catch (error) {
    console.log("Error in acceptConnectionRequest controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject this request" });
    }
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Connection request rejected successfully" });
  } catch (error) {
    console.log("Error in rejectConnectionRequest controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ConnectionRequest.find({
      recipient: userId,
      status: "pending",
    }).populate("sender", "name username profilePiccture headline connections");

    res.json(requests);
  } catch (error) {
    console.log("Error in getConnectionRequests controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate(
      "connections",
      "name username profilePicture headline connections"
    );

    res.json(user.connections);
  } catch (error) {
    console.log("Error in getUserConnections controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { connections: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $pull: { connections: currentUserId },
    });
    res.json({ message: "Connection removed successfully" });
  } catch (error) {
    console.log("Error in removeConnection controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getConnectionStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = req.user;
    if (currentUser.connections.includes(targetUserId)) {
      return res.json({ status: "connected" });
    }
    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId },
      ],
      status: "pending",
    });
    if (pendingRequest) {
      if (pendingRequest.sender.toString() === currentUserId.toString()) {
        return res.json({ status: "pending" });
      } else {
        return res.json({ status: "received", requestId: pendingRequest._id });
      }
    }

    //if no connection or pennding req found
    res.json({ status: "not_connected" });
  } catch (error) {
    console.log("Error in getConnectionStatus controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
