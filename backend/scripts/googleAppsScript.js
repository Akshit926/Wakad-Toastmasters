// This code should be pasted into the Extensions -> Apps Script editor of your Google Sheet.
// Spreadsheet URL: https://docs.google.com/spreadsheets/d/1E6ayvGjbnnd15l5s-MWCAuzqn_QwR3v-VTuhf-bk0fw/edit

function doPost(e) {
  try {
    // Open the spreadsheet by its ID explicitly to ensure we target the correct sheet
    var spreadsheetId = "1E6ayvGjbnnd15l5s-MWCAuzqn_QwR3v-VTuhf-bk0fw";
    var sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();

    // Parse the incoming JSON body
    var data = JSON.parse(e.postData.contents);

    var photoUrl = data.photo_url || "";
    if (data.photo_base64) {
      var mimeType = data.photo_mime_type || "image/jpeg";
      var photoBlob = Utilities.newBlob(
        Utilities.base64Decode(data.photo_base64),
        mimeType,
        data.photo_filename || (data.full_name || "member") + ".jpg"
      );
      var photoFile = DriveApp.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = photoFile.getUrl();
    }

    // Define the headers to keep the sheet structured
    var headers = [
      "Timestamp",
      "Full Name",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Birth Date",
      "Source",
      "Source Other",
      "Photo URL",
      "Photo Filename",
      "Introduction",
      "Hobbies",
      "Why Join",
      "Queries"
    ];

    // If the sheet is brand new/empty, write the headers first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);

      // Style the headers: bold text, white font color, dark red background, and freeze the row
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold")
        .setBackground("#800000") // Toastmasters burgundy color representation
        .setFontColor("#FFFFFF")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      sheet.setFrozenRows(1);

      // Auto-resize columns to fit headers initially
      for (var i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
      }
    }

    // Map data values (fall back to empty strings if not provided)
    var rowData = [
      data.timestamp || new Date().toISOString(),
      data.full_name || "",
      data.first_name || "",
      data.last_name || "",
      data.email || "",
      data.phone || "",
      data.birth_date || "",
      data.source || "",
      data.source_other || "",
      photoUrl,
      data.photo_filename || "",
      data.introduction || "",
      data.hobbies || "",
      data.why_join || "",
      data.queries || ""
    ];

    // Append the member details row
    sheet.appendRow(rowData);

    // Adjust formatting for better visual appearance (wrap text and auto-resize if needed)
    var lastRow = sheet.getLastRow();
    var newRowRange = sheet.getRange(lastRow, 1, 1, headers.length);
    newRowRange.setWrap(true);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Synced successfully to Google Sheets",
      row: lastRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error in syncToGoogleSheets doPost script: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
