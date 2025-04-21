const axios2 = require("axios");
// const { PrismaClient } = require("@prisma/client");

const BACKEND_URL = "http://localhost:3000";

const axios = {
  post: async (...args) => {
    try {
      const res = await axios2.post(...args);
      return res;
    } catch (error) {
      return error.response;
    }
  },
  get: async (...args) => {
    try {
      const res = await axios2.get(...args);
      return res;
    } catch (error) {
      return error.response;
    }
  },
  put: async (...args) => {
    try {
      const res = await axios2.put(...args);
      return res;
    } catch (error) {
      return error.response;
    }
  },
  delete: async (...args) => {
    try {
      const res = await axios2.delete(...args);
      return res;
    } catch (error) {
      return error.response;
    }
  },
};

// const prisma = new PrismaClient();

// beforeEach(async () => {
//   await prisma.user.deleteMany();
// });

describe("Authentication", () => {
  test("User is able to sign up only once", async () => {
    const name = `sourav-${Math.random()}`; //sourav0.24323
    const email = `sourav-${Math.random()}@gmail.com`;
    const password = "23523";

    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
      name,
      email,
      password,
    });

    expect(response.status).toBe(200);

    const updatedResponse = await axios.post(
      `${BACKEND_URL}/api/v1/auth/signup`,
      {
        name,
        email,
        password
      }
    );

    expect(updatedResponse.status).toBe(400);
  });

  test("Signup request fails if username is empty", async () => {
    const name = `sourav-${Math.random()}`; //sourav0.24323
    const email = `sourav-${Math.random()}@gmail.com`;
    const password = "23523";

    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
      email,
      type: "admin",
    });

    expect(response.status).toBe(400);
  });

  test("Signin succeeds if the username and password are correct", async () => {
    const name = `sourav-${Math.random()}`;
    const email = `sourav-${Math.random()}@gmail.com`;
    const password = "123456";

    await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
      name,
      email,
      password,
      type: "admin",
    });

    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signin`, {
      email,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
  });

  test("Signin fails if the username and password are incorrect", async () => {
    const email = `sourav-${Math.random()}@gmail.com`;
    const password = "123456";

    await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
      email,
      password,
      role: "User",
    });

    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signin`, {
      username: "WrongUsername",
      password,
    });

    expect(response.status).toBe(400);
  });
});

describe("Fitness Profile", () => {
    let token;
    let userId;
  
    test("User should be able to create a profile with all details", async () => {
      const name = `Sourav-${Math.random()}`;
      const email = `sourav-${Math.random()}@gmail.com`;
      const password = "password123";
  
      const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
        name,
        email,
        password,
        type: "User",
      });
  
      expect(signupResponse.status).toBe(200);
  
      const signinResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/signin`, {
        email,
        password,
      });
  
      expect(signinResponse.status).toBe(200);
      token = signinResponse.data.token;
      userId = signinResponse.data._id;
  
      const fitnessProfileData = {
        gender: "Male",
        dateOfBirth: "1995-05-20T00:00:00.000Z",
        heightCm: 180,
        weightKg: 75,
        fitnessGoal: "Muscle Gain",
        activityLevel: "Intermediate",
        experienceLevel: "Intermediate",
        medicalConditions: "None",
        dietType: "High Protein",
        preferredWorkoutTime: "Evening",
        profilePictureUrl: "http://example.com/profile.jpg",
      };
  
      const profileResponse = await axios.post(
        `${BACKEND_URL}/api/v1/auth/profile`,
        fitnessProfileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.message).toBe("Profile created successfully");
    });
  
    test("User should be able to update their profile", async () => {
      const updatedProfileData = {
        heightCm: 185,
        weightKg: 78,
        fitnessGoal: "Weight Loss",
        activityLevel: "Advanced",
      };
  
      const updateResponse = await axios.put(
        `${BACKEND_URL}/api/v1/auth/profile`,
        updatedProfileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.message).toBe("Profile updated successfully");
      expect(updateResponse.data.updatedProfile.heightCm).toBe(185);
      expect(updateResponse.data.updatedProfile.fitnessGoal).toBe("Weight Loss");
    });
  
    test("Should not allow update with invalid token (wrong user)", async () => {
      const fakeToken = "Bearer invalid.token.string";
  
      const updatedProfileData = {
        heightCm: 190,
        fitnessGoal: "Endurance",
      };
  
      try {
        await axios.put(
          `${BACKEND_URL}/api/v1/auth/profile`,
          updatedProfileData,
          {
            headers: {
              Authorization: fakeToken,
            },
          }
        );
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toMatch(/unauthorized|invalid/i);
      }
    });
  });
  
  
