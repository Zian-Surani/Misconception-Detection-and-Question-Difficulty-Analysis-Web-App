# Misconception Detection and Question Difficulty Analysis Web App

## 📘 Overview

This repository contains a comprehensive web application for **detecting student misconceptions** and **analyzing question difficulty** using advanced machine learning and natural language processing (NLP) techniques. The system integrates backend ML models, a web-based interface, and MATLAB-based result analysis tools to provide educators with data-driven insights into student understanding.

---

## 🚀 Features

- **Misconception Detection:** Uses transformer-based NLP models to classify and identify misconceptions in student responses.  
- **Question Difficulty Analysis:** Predicts difficulty levels of questions using feature-based regression and neural architectures.  
- **Result Analysis (MATLAB):** Includes MATLAB scripts to visualize and analyze model performance metrics, confusion matrices, and ROC curves.  
- **Interactive Web Interface:** Flask-powered frontend for uploading questions, viewing predictions, and analyzing student responses.  
- **Data Preprocessing Pipeline:** Cleans and normalizes text inputs with tokenization, stopword removal, and vectorization.  

---

## 🧠 Methodology

### 1. Data Preprocessing
- Tokenization and lemmatization of input text.  
- Vectorization using TF-IDF and word embeddings.  
- Outlier handling and normalization for numerical attributes.  

### 2. Model Architecture
- Transformer-based feature extraction using BERT or DistilBERT.  
- Feedforward neural networks for classification and regression tasks.  
- Fine-tuning for domain-specific educational datasets.  

### 3. Result Analysis (MATLAB)
- MATLAB scripts under the `Result Analysis` folder perform:
  - Model accuracy and loss visualization  
  - Confusion matrix and classification reports  
  - ROC and Precision-Recall curve generation  
  - Comparative metric evaluation across model versions  

---

## 🧩 Project Structure

```
Misconception-Detection-and-Question-Difficulty-Analysis-Web-App/
│
├── static/                      # CSS, JS, and image assets
├── templates/                   # HTML frontend templates
├── models/                      # Trained ML models and scripts
├── Result Analysis/             
│   ├── performance_analysis.m    # MATLAB script for performance visualization
│   ├── metrics_evaluation.m      # Computes accuracy, F1-score, precision, recall
│   └── confusion_matrix_plot.m   # Generates confusion matrix heatmaps
├── app.py                        # Flask main application file
├── requirements.txt              # Python dependencies
├── README.md                     # Documentation
└── data/                         # Sample datasets
```

---

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Zian-Surani/Misconception-Detection-and-Question-Difficulty-Analysis-Web-App.git
   cd Misconception-Detection-and-Question-Difficulty-Analysis-Web-App
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Access the app locally at:  
   **http://127.0.0.1:5000/**

---

## 🧪 Running MATLAB Result Analysis

Navigate to the `Result Analysis` folder and run the desired script:
```matlab
cd('Result Analysis')
run('performance_analysis.m')
```

Ensure MATLAB has access to exported CSV logs or JSON outputs from the model for accurate visualization.

---

## 📊 Metrics Evaluated

| Metric | Description |
|---------|--------------|
| **Accuracy** | Correct predictions over total predictions |
| **Precision** | Positive predictions that were actually correct |
| **Recall** | Correctly identified positive samples |
| **F1-Score** | Harmonic mean of precision and recall |
| **AUC-ROC** | Trade-off between sensitivity and specificity |

---

## 🧩 Future Enhancements

- Integration with student learning management systems (LMS)  
- Real-time adaptive difficulty prediction  
- Support for multilingual student response analysis  
- Cloud-based deployment using Docker and Google Cloud Run  

---

## 👨‍💻 Contributors

- **Zian Rajeshkumar Surani** – Project Lead & Developer  
- **R V Darsan** – Research & Model Evaluation  
- **Dr. Usha Kiruthika** – Academic Supervisor  

---

## 📜 License

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for details.
