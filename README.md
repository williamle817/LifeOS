# LifeOS — Your Personal Life Manager

**LifeOS** is an all in one personal management application that connects scheduling, personal finance, academic progress, fitness activities, and an AI assistant in one system. The main idea is simple: enter information once, and LifeOS automatically updates everything related to it.

## Goals

The goal of **LifeOS** is to replace multiple disconnected personal tracking tools with one connected system. Schedule acts as the central source of daily information, while Money, Academic, Fitness, Dashboard, and the AI Personal Assistant use that information to automatically organize, calculate, and summarize the user's daily life.

---

## Modules

### Schedule
The central module of LifeOS. Users can create, edit, delete, and view events by day, week, or month. Events can have different types such as regular activities, work, gym, dining, classes, or exams. Each event type has its own customized form. Work events can store start time, end time, total working hours, and cash tips. Gym events can store workout information, duration, and calories burned. Dining events can store the restaurant, amount spent, and notes. Classes can be connected to specific courses, while exams can store the course, exam name, score, total possible score, and grading weight.

### Module Integration
Schedule events automatically update other parts of LifeOS. Completing a work shift adds working hours and tips to Money. Adding a dining expense automatically creates an expense transaction. Entering an exam score updates the corresponding course in Academic. Completing a gym session adds the activity to Fitness. Schedule acts as the main entry point for daily activities so users do not need to enter the same information multiple times.

```
Create Work event   ->  Money automatically updates income
Create Dining event ->  Money automatically adds expense
Create Exam         ->  Academic automatically recalculates grade
Create Gym event    ->  Fitness automatically updates statistics
```

### Money
Tracks income and expenses by week and month. Users can configure their hourly wage and tax information. LifeOS calculates gross income from recorded work hours, adds cash tips and other income, estimates taxes, and calculates estimated take home income. Expenses can be entered manually or created automatically from related Schedule events. The Money dashboard displays total income, taxes, expenses, and remaining money, along with charts for income versus spending over time and spending by category.

### Academic
Allows users to create courses and define how each course is graded. A course can contain categories such as exams, homework, quizzes, projects, and participation, with each category assigned a percentage of the final grade. Users can enter individual scores, and LifeOS automatically calculates the current course grade and how much of the course has already been completed or graded. Classes and exams can also be connected directly to Schedule events.

### Fitness
Keeps a simple history of gym sessions and other exercise activities. Each activity can contain workout type, duration, calories burned, and optional notes. LifeOS can summarize workout frequency and calories burned by week or month while keeping fitness information connected to the user's schedule.

### AI Personal Assistant
Allows users to interact with LifeOS using natural language. The assistant can read information from Schedule, Money, Academic, and Fitness and answer questions such as "How much did I spend this month?", "How many hours did I work this week?", "What exams do I have next week?", or "When am I free tomorrow?" The assistant can also perform actions such as adding or editing events, recording expenses, updating exam scores, checking availability, and modifying other information stored in LifeOS.

### Dashboard
Provides a quick overview of the user's current life. When opening LifeOS, users can immediately see today's schedule, upcoming events, current income and spending, academic progress, recent fitness activity, and other important information without opening each module separately.
