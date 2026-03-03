/* eslint-disable @typescript-eslint/no-unused-vars */
import { calculateTotalPSIForUser, calculatePSIForUser } from '../helpers/psi';
import * as functions from "firebase-functions/v1";

export const calculateTotalPSI = functions.https.onCall(async (data, context): Promise<number> => {
    const cid = data.cid;
    const usersCollectionID = data.usersCollectionID;

    return calculateTotalPSIForUser(cid, usersCollectionID);
});

export const calculatePSI = functions.https.onCall(async (data, context): Promise<number> => {
    const cid = data.cid;
    const usersCollectionID = data.usersCollectionID;

    return calculatePSIForUser(cid, usersCollectionID);
});
