# Product Requirements Document: Savings Tracker (Tích Lũy)

## 1. Introduction
This application is a personal savings tracker designed to help users monitor their daily savings habits. The goal is to provide a visual and simple way to record and view savings progress.

## 2. Core Features

### 2.1. Quick Save (Tích Ngay)
- **Functionality**: A button located in the top-right corner.
- **Behavior**: When clicked, it adds a transaction record for the current date.
- **Default Value**: 300,000 VND.
- **Customization**: Users can input a different amount if they wish to save more or less than the default.
- **Feedback**: Immediate visual update on the calendar.

### 2.2. Home Page (Calendar View)
- **Layout**: Displays a general calendar.
- **Visual Indicator**: Days that have a savings record will display a "tick" (check) mark.
- **Interaction**: Users can see at a glance which days they have successfully saved money.

### 2.3. History/Details Tab
- **Layout**: A tabular view of the data.
- **Columns**:
    - **Date**: The day of the saving.
    - **Amount**: The amount saved.
- **Summary**: Display the total amount saved across all records.

## 3. Technical Requirements
- **Framework**: Next.js (ReactJS).
- **Runtime**: Node.js 18.
- **UI Framework**: Ant Design (antd).
- **Storage**: IndexedDB (Client-side browser storage).
