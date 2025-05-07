from datetime import date, time, timedelta
from models import Attendance
from database import SessionLocal

def create_mock_data():
    db = SessionLocal()
    
    # Today's date
    today = date.today()
    
    # Sample data
    mock_attendance = [
        {
            "employee_id": 101,
            "date": today,
            "check_in": time(9, 15),  # Late arrival
            "check_out": time(18, 0),
            "status": "Present",
            "late_entry": True,
            "early_exit": False
        },
        {
            "employee_id": 102,
            "date": today,
            "check_in": time(8, 55),
            "check_out": time(17, 45),  # Early exit
            "status": "Present",
            "late_entry": False,
            "early_exit": True
        },
        {
            "employee_id": 103,
            "date": today,
            "check_in": None,
            "check_out": None,
            "status": "Absent",
            "late_entry": False,
            "early_exit": False
        }
    ]
    
    # Add some historical data for the current month
    for day in range(1, today.day):
        for employee in [101, 102, 103]:
            attendance_date = today.replace(day=day)
            check_in = time(9, 0) if employee != 101 else time(9, 15)
            check_out = time(18, 0) if employee != 102 else time(17, 45)
            
            db_attendance = Attendance(
                employee_id=employee,
                date=attendance_date,
                check_in=check_in,
                check_out=check_out,
                status="Present",
                late_entry=(employee == 101),
                early_exit=(employee == 102)
            )
            db.add(db_attendance)
    
    # Add today's data
    for record in mock_attendance:
        db_attendance = Attendance(**record)
        db.add(db_attendance)
    
    db.commit()
    db.close()

if __name__ == "__main__":
    create_mock_data() 