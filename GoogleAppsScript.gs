/**
 * GAYATRI VIDYA PARISHAD INSTITUTE OF HIGHER LEARNING AND RESEARCH
 * Google Apps Script for Live Timetable API
 * 
 * INSTRUCTIONS TO CONNECT YOUR GOOGLE SHEET:
 * 1. Open your Google Sheet where you maintain the Timetables.
 * 2. Click on "Extensions" -> "Apps Script" in the top menu.
 * 3. Delete any existing code in Code.gs and paste this ENTIRE script.
 * 4. Click "Deploy" (top right) -> "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "Timetable API v1.0".
 * 7. Set Execute as: "Me" (your Google Workspace account).
 * 8. Set Who has access: "Anyone" (or "Anyone within domain" if restricted to GVP domain).
 * 9. Click "Deploy", authorize permissions when prompted.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 11. Paste this Web App URL into the website's "Google Sheet Sync" settings modal!
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {
      status: "success",
      universityInfo: {
        name: "GAYATRI VIDYA PARISHAD INSTITUTE OF HIGHER LEARNING AND RESEARCH",
        statusText: "(Deemed to be University under Distinct Category under Section 3 of the UGC Act, 1956)",
        address: "Kommadi, Madhurawada, Visakhapatnam, Andhra Pradesh - 530 048",
        academicYear: "2026-27",
        subTitle: "TIME TABLE FOR THE ACADEMIC YEAR 2026-27, B.Tech. 1st Sem",
        version: "1.0",
        wef: "2026-27"
      },
      timetableData: {}
    };

    var sheets = ss.getSheets();
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      
      // Skip meta or hidden sheets
      if (sheetName.toLowerCase().indexOf("config") > -1 || sheetName.toLowerCase().indexOf("meta") > -1) {
        continue;
      }

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) continue;

      // Detect sheet structure: Tabular vs Grid
      var isTabular = (data[0][0] && data[0][0].toString().toLowerCase() === "day" && 
                      data[0][1] && data[0][1].toString().toLowerCase() === "branch");

      if (isTabular) {
        // Tabular structure: Day | Branch | 09:00-10:00 | 10:00-11:00 | ...
        var headers = data[0];
        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          var day = row[0] ? row[0].toString().trim().toUpperCase() : "";
          var branch = row[1] ? row[1].toString().trim().toUpperCase() : sheetName.toUpperCase();

          if (!day || !branch) continue;

          if (!result.timetableData[branch]) {
            result.timetableData[branch] = {};
          }
          if (!result.timetableData[branch][day]) {
            result.timetableData[branch][day] = {};
          }

          for (var c = 2; c < headers.length; c++) {
            var timeSlot = headers[c] ? headers[c].toString().trim() : "";
            var cellValue = row[c] ? row[c].toString().trim() : "";
            
            if (timeSlot && cellValue) {
              // Parse cell format: "Subject | Faculty | Room" or raw string
              var parsed = parseCellContent(cellValue);
              result.timetableData[branch][day][timeSlot] = parsed;
            }
          }
        }
      } else {
        // Sheet per branch grid structure
        var branchName = sheetName.toUpperCase();
        var headers = data[0];
        result.timetableData[branchName] = {};

        for (var r = 1; r < data.length; r++) {
          var day = data[r][0] ? data[r][0].toString().trim().toUpperCase() : "";
          if (!day) continue;

          result.timetableData[branchName][day] = {};
          for (var c = 1; c < headers.length; c++) {
            var timeSlot = headers[c] ? headers[c].toString().trim() : "";
            var cellValue = data[r][c] ? data[r][c].toString().trim() : "";

            if (timeSlot && cellValue) {
              var parsed = parseCellContent(cellValue);
              result.timetableData[branchName][day][timeSlot] = parsed;
            }
          }
        }
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper to parse text cell into subject, faculty, room, and lab status
 */
function parseCellContent(val) {
  if (!val) return { subject: '', faculty: '', room: '' };
  
  // Standard format check: "PCE LAB Dr. SP, Dr. KVNL, Dr. MRR CHEM. LAB-1"
  var isLab = val.toUpperCase().indexOf("LAB") > -1;
  
  // Split lines if multiline cell
  var lines = val.split("\n");
  if (lines.length > 1) {
    return {
      subject: lines[0].trim(),
      faculty: lines[1] ? lines[1].trim() : '',
      room: lines[2] ? lines[2].trim() : '',
      isLab: isLab
    };
  }

  return {
    subject: val,
    faculty: '',
    room: '',
    isLab: isLab
  };
}
