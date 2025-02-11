import * as functions from 'firebase-functions';
import {calculateTotalYTDForUser, calculateYTDForUser} from '../helpers/ytd';

exports.calculateTotalYTD = functions.https.onCall(async (data, context): Promise<number> => {
    const cid = data.cid;
    const usersCollectionID = data.usersCollectionID;

    return calculateTotalYTDForUser(cid, usersCollectionID);
});

exports.calculateTotalYTD = functions.https.onCall(async (data, context): Promise<number> => {
    const cid = data.cid;
    const usersCollectionID = data.usersCollectionID;

    return calculateYTDForUser(cid, usersCollectionID);
});