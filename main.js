const fs = require("fs");

// Function 1 getShiftDuration(startTime,endTime)

function timeToSeconds(time) {
    time = time.trim();
    let parts = time.split(" ");
    let period = parts[1];
    let timeParts = parts[0].split(":");
    let hours = parseInt(timeParts[0]);
    let minutes = parseInt(timeParts[1]);
    let seconds = parseInt(timeParts[2]);

    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;

    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;

    return h + ":" + m + ":" + s;
}

function getShiftDuration(startTime, endTime) {
    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);
    let diff = endSeconds - startSeconds;
    return secondsToTime(diff);
}

// Function 2 getIdleTime(startTime,endTime)

function getIdleTime(startTime, endTime) {
    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);

    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;

    let idleBefore = 0;
    let idleAfter = 0;

    if (startSeconds < deliveryStart) {
        idleBefore = deliveryStart - startSeconds;
    }

    if (endSeconds > deliveryEnd) {
        idleAfter = endSeconds - deliveryEnd;
    }

    return secondsToTime(idleBefore + idleAfter);
}

// Function 3 getActiveTime(shiftDuration, idleTime)

function getActiveTime(shiftDuration, idleTime) {
    let shiftSeconds = timeToSecondsSimple(shiftDuration);
    let idleSeconds = timeToSecondsSimple(idleTime);
    let diff = shiftSeconds - idleSeconds;
    return secondsToTime(diff);
}

function timeToSecondsSimple(time) {
    let parts = time.split(":");
    let hours = parseInt(parts[0]);
    let minutes = parseInt(parts[1]);
    let seconds = parseInt(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
}

// Function 4 metQuota(date, activeTime)

function metQuota(date, activeTime) {
    let activeSeconds = timeToSecondsSimple(activeTime);

    let parts = date.split("-");
    let month = parseInt(parts[1]);
    let day = parseInt(parts[2]);

    let quota;
    if (month === 4 && day >= 10 && day <= 30) {
        quota = 6 * 3600;
    } else {
        quota = 8 * 3600 + 24 * 60;
    }

    return activeSeconds >= quota;
}

// Function 5 addShiftRecord(textFile,shiftObj)

function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0].trim() === shiftObj.driverID && cols[2].trim() === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: false
    };

    let newLine = "\n" + shiftObj.driverID + "," + shiftObj.driverName + "," + shiftObj.date + "," + shiftObj.startTime + "," + shiftObj.endTime + "," + shiftDuration + "," + idleTime + "," + activeTime + "," + quota + "," + false;

    let lastIndex = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].split(",")[0].trim() === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex === -1) {
        content = content.trimEnd() + newLine;
    } else {
        lines.splice(lastIndex + 1, 0, newLine.trim());
        content = lines.join("\n");
    }

    fs.writeFileSync(textFile, content, "utf8");
    return newRecord;
}

// Function 6 setBonus(textFile, driverID, date,newValue)

function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0].trim() === driverID && cols[2].trim() === date) {
            cols[9] = newValue;
            lines[i] = cols.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), "utf8");
}

// Function 7 countBonusPerMonth(textFile, driverID, month)

function countBonusPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");

    let driverExists = false;
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        let recordMonth = cols[2].trim().split("-")[1];

        if (cols[0].trim() === driverID) {
            driverExists = true;
            if (parseInt(recordMonth) === parseInt(month) && cols[9].trim() === "true") {
                count++;
            }
        }
    }

    if (!driverExists) return -1;
    return count;
}

// Function 8

function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        let recordMonth = parseInt(cols[2].trim().split("-")[1]);

        if (cols[0].trim() === driverID && recordMonth === month) {
            totalSeconds += timeToSecondsSimple(cols[7].trim());
        }
    }

    return secondsToTime(totalSeconds);
}

// Function 9

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");

    let rateContent = fs.readFileSync(rateFile, "utf8");
    let rateLines = rateContent.trim().split("\n");

    let dayOff = "";
    for (let i = 0; i < rateLines.length; i++) {
        let cols = rateLines[i].split(",");
        if (cols[0].trim() === driverID) {
            dayOff = cols[1].trim();
        }
    }

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        let recordMonth = parseInt(cols[2].trim().split("-")[1]);

        if (cols[0].trim() === driverID && recordMonth === month) {
            let date = cols[2].trim();
            let dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
            let day = parseInt(date.split("-")[2]);

            if (dayName === dayOff) continue;

            if (month === 4 && day >= 10 && day <= 30) {
                totalSeconds += 6 * 3600;
            } else {
                totalSeconds += 8 * 3600 + 24 * 60;
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;
    return secondsToTime(totalSeconds);
}

// Function 10

function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rateContent = fs.readFileSync(rateFile, "utf8");
    let rateLines = rateContent.trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < rateLines.length; i++) {
        let cols = rateLines[i].split(",");
        if (cols[0].trim() === driverID) {
            basePay = parseInt(cols[2].trim());
            tier = parseInt(cols[3].trim());
        }
    }

    let actualSeconds = timeToSecondsSimple(actualHours);
    let requiredSeconds = timeToSecondsSimple(requiredHours);

    if (actualSeconds >= requiredSeconds) return basePay;

    let missingSeconds = requiredSeconds - actualSeconds;
    let missingHours = missingSeconds / 3600;

    let allowedMissing = 0;
    if (tier === 1) allowedMissing = 50;
    if (tier === 2) allowedMissing = 20;
    if (tier === 3) allowedMissing = 10;
    if (tier === 4) allowedMissing = 3;

    missingHours = missingHours - allowedMissing;
    if (missingHours <= 0) return basePay;

    let billableHours = Math.floor(missingHours);
    let deductionRate = Math.floor(basePay / 185);
    let deduction = billableHours * deductionRate;

    return basePay - deduction;
}












module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};