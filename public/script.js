// Auto-fill form if referenceId is in URL
window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const referenceId = urlParams.get("referenceId");

  const hideSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "none";
  };

  const showSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "block"; // Or "flex" depending on your layout
  };

  if (referenceId) {
    try {
      const res = await fetch(`/api/faults/${referenceId}`);
      if (!res.ok) throw new Error("No theft found.");
      const data = await res.json();
      fillFormWithData(data);
      document.getElementById("refIdDisplay").textContent = referenceId;
      document.getElementById("referenceId").value = referenceId;
      // document.getElementById("refIncidentphoto1").value = refIncidentphoto1;


      // Disable Fault Description fields
      const faultDescriptionSection = document.querySelector('.form-section');
      const inputs = faultDescriptionSection.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => input.disabled = true);

      // Show middle and lower sections
      showSection('actionPlan');
      showSection('closureDetails');

    } catch (err) {
      console.error(err);
      alert("Failed to load theft data for editing.");
    }
  } else {
    // Hide middle and lower sections if no referenceId
    hideSection('actionPlan');
    hideSection('closureDetails');
  }
};

// 2)FORM DATA PREFILL Function
// iterates through the keys of fetchede data 
// fills matching inputfields in the form using the name attributes

function formatDateOnly(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toISOString().split("T")[0]; // Returns 'YYYY-MM-DD'
}

function fillFormWithData(data) {
  const form = document.getElementById("faultForm");

  Object.keys(data).forEach(key => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) {
      // If input is a date field, format it properly
      if (input.type === "date") {
        input.value = formatDateOnly(data[key]);
      } else {
        input.value = data[key];
      }
    }
  });
}
// 3) Sends GET req to /api/generate-id on backend
// displays the new referenceId and stores it in hodden field
async function generateReferenceId() {
  try {
    const res = await fetch("/api/generate-id");
    const data = await res.json();
    const refId = data.referenceId;
    document.getElementById("refIdDisplay").textContent = refId;
    document.getElementById("referenceId").value = refId;
  } catch (error) {
    console.error("Error generating reference ID:", error);
    alert("Failed to generate Reference ID. Please try again.");
  }
}

// Handle form submission
//Collects data and images into FormData.
//Sends the data to backend using POST (or PUT if editing).
//Alerts success or failure.
document.getElementById("faultForm").addEventListener("submit", async function (e) { 
  e.preventDefault();

  // Make sure hidden fields are not required
  const hiddenSections = ["actionPlan", "closureDetails"];
  hiddenSections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section && section.style.display === "none") {
      const inputs = section.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.removeAttribute("required");
        input.value = ""; // Ensure it's submitted as empty string
      });
    }
  });

  const formData = new FormData(this);
  const entry = {};
  formData.forEach((value, key) => entry[key] = value);

  if (!entry.referenceId) {
    alert("Please generate the Reference ID first!");
    return;
  }
  const formData1 =new FormData()
  formData1.append('json_data', JSON.stringify(entry));
  // formData1.append('image', entry.incidentPhoto);
formData1.append('image', entry.incidentPhoto);   // First photo
formData1.append('image1', entry.incidentPhoto1); // Second photo

  const isEdit = new URLSearchParams(window.location.search).get("referenceId");
  const url = isEdit
    ? `/api/faults/${entry.referenceId}`
    : `/api/faults`;
  const method = isEdit ? "PUT" : "POST";
  // entry.incidentPhoto=entry.incidentPhoto.name;
  try {
    const res = await fetch(url, {
      method,
      // headers: { "Content-Type": "application/json" },
      body:formData1,
    });

    const result = await res.json();

    if (res.ok) {
      alert(isEdit ? "Fault updated successfully!" : "Data submitted successfully!");
      this.reset();
      document.getElementById("refIdDisplay").textContent = "Not Generated";
      if (isEdit) window.location.href = 'data.html'; // Redirect after update
    } else {
      alert("Error: " + result.error);
    }
  } catch (error) {
    console.error("Submission error:",error);
    alert("Failed to submit data. Please try again.");
  }
});

