import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

/**
 * Get today's start and end timestamps.
 */
const getTodayRange = () => {
  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  return {
    start: Timestamp.fromDate(startOfDay),
    end: Timestamp.fromDate(endOfDay),
  };
};

/**
 * Subscribe to today's visits.
 */
export const subscribeToTodayVisits = (callback, onError) => {
  const { start, end } = getTodayRange();

  const visitsRef = collection(db, "visits");

  const q = query(
    visitsRef,
    where("entryTime", ">=", start),
    where("entryTime", "<=", end),
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const visits = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      callback(visits);
    },
    (error) => {
      console.error("Today's visits listener error:", error);

      if (onError) {
        onError(error);
      }
    },
  );

  return unsubscribe;
};

/**
 * Subscribe to all visitors.
 */
export const subscribeToVisitors = (callback, onError) => {
  const visitorsRef = collection(db, "visitors");

  const q = query(visitorsRef);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const visitors = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      callback(visitors);
    },
    (error) => {
      console.error("Visitors listener error:", error);

      if (onError) {
        onError(error);
      }
    },
  );

  return unsubscribe;
};

/**
 * Check out a visitor.
 *
 * Updates:
 * status: INSIDE → EXITED
 * exitTime: null → current server timestamp
 */
export const checkoutVisit = async (visitId) => {
  if (!visitId) {
    throw new Error("Visit ID is required.");
  }

  try {
    const visitRef = doc(db, "visits", visitId);

    await updateDoc(visitRef, {
      status: "EXITED",
      exitTime: serverTimestamp(),
    });

    return {
      success: true,
      visitId,
    };
  } catch (error) {
    console.error("Checkout visitor error:", error);

    throw error;
  }
};

export const subscribeToVisitsByDate = (date, callback, onError) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const start = Timestamp.fromDate(startOfDay);
    const end = Timestamp.fromDate(endOfDay);

    const q = query(
      collection(db, "visits"),
      where("entryTime", ">=", start),
      where("entryTime", "<=", end),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const visits = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        visits.sort((a, b) => {
          const aTime = a.entryTime?.toMillis?.() || 0;
          const bTime = b.entryTime?.toMillis?.() || 0;

          return bTime - aTime;
        });

        callback(visits);
      },
      (error) => {
        console.error("Subscribe to date visits error:", error);

        if (onError) {
          onError(error);
        }
      },
    );
  } catch (error) {
    console.error("Date visit subscription error:", error);

    if (onError) {
      onError(error);
    }

    return () => {};
  }
};

export const subscribeToAllVisits = (callback, onError) => {
  try {
    const q = query(collection(db, "visits"));

    return onSnapshot(
      q,
      (snapshot) => {
        const visits = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        visits.sort((a, b) => {
          const aTime = a.entryTime?.toMillis?.() || 0;

          const bTime = b.entryTime?.toMillis?.() || 0;

          return bTime - aTime;
        });

        callback(visits);
      },
      (error) => {
        console.error("Subscribe to all visits error:", error);

        if (onError) {
          onError(error);
        }
      },
    );
  } catch (error) {
    console.error("All visits subscription error:", error);

    if (onError) {
      onError(error);
    }

    return () => {};
  }
};

export const subscribeToPoliceDashboardStats = (callback, onError) => {
  try {
    const unsubscribe = subscribeToVisitsByDate(
      new Date(),
      (visits) => {
        const total = visits.length;

        const currentlyInside = visits.filter(
          (visit) => visit.status === "INSIDE",
        ).length;

        const exitedToday = visits.filter(
          (visit) => visit.status === "EXITED",
        ).length;

        const petitionVisitors = visits.filter(
          (visit) => visit.purpose === "Petition / Complaint",
        ).length;

        const meetingVisitors = visits.filter(
          (visit) => visit.purpose === "Meeting",
        ).length;

        const otherVisitors = visits.filter(
          (visit) => visit.purpose === "Other",
        ).length;

        callback({
          total,
          currentlyInside,
          exitedToday,
          petitionVisitors,
          meetingVisitors,
          otherVisitors,
        });
      },
      onError,
    );

    return unsubscribe;
  } catch (error) {
    console.error("Police dashboard stats error:", error);

    if (onError) {
      onError(error);
    }

    return () => {};
  }
};
